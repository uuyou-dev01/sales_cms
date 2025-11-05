import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, image, brandName, skus } = body;

    // 验证必填字段
    if (!name || !brandName) {
      return NextResponse.json(
        { success: false, message: "系列名称和品牌名称为必填项" },
        { status: 400 }
      );
    }

    // 使用事务创建品牌、系列、角色和SKU
    const result = await prisma.$transaction(async (tx) => {
      // 查找或创建品牌
      let brand = await tx.toyBrand.findFirst({
        where: { name: brandName },
      });

      if (!brand) {
        brand = await tx.toyBrand.create({
          data: {
            name: brandName,
            description: "",
            logo: "",
            isActive: true,
          },
        });
      }

      // 创建系列
      const series = await tx.toySeries.create({
        data: {
          name,
          brandId: brand.id,
          description: "",
          image: image || "",
          isActive: true,
        },
      });

      // 创建角色和SKU
      const createdSkus = [];
      for (const skuData of skus || []) {
        // 创建角色（角色名称就是SKU名称）
        const character = await tx.toyCharacter.create({
          data: {
            name: skuData.name,
            seriesId: series.id,
            description: skuData.variant || "普通款",
            isActive: true,
          },
        });

        // 创建SKU
        const sku = await tx.toySKU.create({
          data: {
            name: skuData.name,
            characterId: character.id,
            description: "",
            image: skuData.imageUrl || "",
            currentStock: skuData.stock || 0,
            costPrice: skuData.costPrice || 0,
            suggestedPrice: skuData.price || 0,
            isActive: true,
          },
        });

        // 如果有初始库存，创建库存批次
        if (skuData.stock > 0) {
          await tx.inventoryBatch.create({
            data: {
              skuId: sku.id,
              quantity: skuData.stock,
              inboundDate: new Date(),
              unitCostPrice: skuData.costPrice || 0,
            },
          });
        }

        createdSkus.push(sku);
      }

      return { series, brand, skus: createdSkus };
    });

    return NextResponse.json({
      success: true,
      data: result.series,
      message: "系列创建成功",
    });
  } catch (error) {
    console.error("创建系列失败:", error);
    return NextResponse.json(
      { success: false, message: "创建系列失败" },
      { status: 500 }
    );
  }
}