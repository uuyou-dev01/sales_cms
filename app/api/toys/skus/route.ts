import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seriesId, name, variant, description, image, currentStock, costPrice, suggestedPrice } = body;

    // 验证必填字段
    if (!name || !seriesId) {
      return NextResponse.json(
        { success: false, message: "SKU名称和系列ID为必填项" },
        { status: 400 }
      );
    }

    // 检查系列是否存在
    const series = await prisma.toySeries.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      return NextResponse.json(
        { success: false, message: "系列不存在" },
        { status: 404 }
      );
    }

    // 使用事务创建角色和SKU
    const result = await prisma.$transaction(async (tx) => {
      // 创建角色
      const character = await tx.toyCharacter.create({
        data: {
          name: name, // 角色名称就是SKU名称
          seriesId: seriesId,
          description: variant || "普通款", // 使用variant作为description
          isActive: true,
        },
      });

      // 检查SKU名称是否已存在（同一角色下）
      const existingSKU = await tx.toySKU.findFirst({
        where: {
          name: name,
          characterId: character.id,
        },
      });

      if (existingSKU) {
        throw new Error("该角色下已存在同名SKU");
      }

      // 创建SKU
      const sku = await tx.toySKU.create({
        data: {
          name,
          description: description || "",
          image: image || "",
          characterId: character.id,
          currentStock: currentStock || 0,
          costPrice: costPrice || 0,
          suggestedPrice: suggestedPrice || 0,
          isActive: true,
        },
      });

      // 如果有初始库存，创建初始库存批次
      if (currentStock > 0) {
        await tx.inventoryBatch.create({
          data: {
            skuId: sku.id,
            quantity: currentStock,
            inboundDate: new Date(),
            unitCostPrice: costPrice || 0,
          },
        });
      }

      return { sku, character };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.sku.id,
        characterId: result.character.id,
        ...result.sku,
      },
      message: "SKU创建成功",
    });
  } catch (error) {
    console.error("创建SKU失败:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "创建SKU失败" },
      { status: 500 }
    );
  }
}