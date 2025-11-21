import { NextRequest } from 'next/server';
import { getAuthFromRequest, hasPermission } from '@/lib/auth';
import { ok, badRequest, forbidden, serverError } from '@/src/modules/shared/api/response';
import { prisma } from '@/lib/prisma';
import { createFinanceRecord } from '@/lib/finance';
import { logActivity } from '@/lib/audit';
import { getLatestRate, convert } from '@/lib/exchange';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthFromRequest(req);
    if (!user || !hasPermission(user, 'USER')) return forbidden();
    
    const body = await req.json();
    const { trackingNo, status, cost, currency, route, packages } = body;
    // packages: { logisticsId: string, weight: number }[]

    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return badRequest('NO_PACKAGES_SELECTED');
    }

    // 1. Create Master Logistics Record (The Consolidated Package)
    // We use a generated ID for relatedId as it's a consolidation of multiple sources
    const masterLogistics = await prisma.logistics.create({
      data: {
        relatedType: 'CONSOLIDATION',
        relatedId: `GRP-${Date.now()}`, 
        trackingNo,
        status,
        cost,
        currency,
        fromCountry: route === 'CHINA_TO_JAPAN' ? 'CN' : undefined,
        toCountry: route === 'CHINA_TO_JAPAN' ? 'JP' : undefined,
        segments: {
            route,
            packages // Store the source packages and their weights in segments
        },
        destination: 'FORWARDER'
      }
    });

    // 2. Calculate Allocation
    const totalWeight = packages.reduce((sum: number, p: any) => sum + (Number(p.weight) || 0), 0);
    let costCNY = Number(cost);
    
    // Convert total cost to CNY if needed
    if (currency && currency !== 'CNY') {
        const rate = await getLatestRate(currency, 'CNY');
        if (rate) {
            costCNY = convert(costCNY, rate);
        }
    }

    // 3. Process each package: Update status and Allocate cost to Items
    await prisma.$transaction(async (tx) => {
        for (const pkg of packages) {
            const { logisticsId, weight } = pkg;
            if (!logisticsId) continue;

            // Mark original logistics as CONSOLIDATED
            await tx.logistics.update({
                where: { id: logisticsId },
                data: { 
                    status: 'CONSOLIDATED',
                    destination: 'FORWARDER', // It arrived at forwarder and was consolidated
                    segments: {
                        consolidatedInto: masterLogistics.id
                    }
                }
            });

            // Calculate cost share for this package
            const weightRatio = totalWeight > 0 ? (Number(weight) / totalWeight) : 0;
            const packageCostCNY = costCNY * weightRatio;

            if (packageCostCNY > 0) {
                // Find associated items
                const logisticsRecord = await tx.logistics.findUnique({ where: { id: logisticsId } });
                if (!logisticsRecord) continue;

                let itemIds: string[] = [];

                if (logisticsRecord.relatedType === 'PURCHASE_ORDER') {
                    const order = await tx.purchaseOrder.findUnique({
                        where: { id: logisticsRecord.relatedId },
                        include: { details: { include: { items: true } } }
                    });
                    if (order) {
                        order.details.forEach(detail => {
                            detail.items.forEach(item => itemIds.push(item.itemId));
                        });
                    }
                } else if (logisticsRecord.relatedType === 'ITEM') {
                    itemIds.push(logisticsRecord.relatedId);
                }

                if (itemIds.length > 0) {
                    // Distribute package cost to items (Average distribution for now)
                    const costPerItem = packageCostCNY / itemIds.length;
                    
                    for (const itemId of itemIds) {
                        await tx.item.update({
                            where: { itemId },
                            data: {
                                purchaseCostCNY: {
                                    increment: costPerItem // Add to purchase cost as requested
                                }
                            }
                        });
                    }
                }
            }
        }
    });

    // 4. Record Finance
    if (cost && currency) {
        await createFinanceRecord(
            'LOGISTICS',
            masterLogistics.id,
            'OUT',
            Number(cost),
            currency,
            { relatedType: 'CONSOLIDATION', relatedId: masterLogistics.relatedId },
            user.id
        );
    }

    await logActivity(user.id, 'CONSOLIDATE_LOGISTICS', 'Logistics', masterLogistics.id);

    return ok(masterLogistics);

  } catch (e) {
    console.error('CONSOLIDATION_FAILED', e);
    return serverError('CONSOLIDATION_FAILED');
  }
}

