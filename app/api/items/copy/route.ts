import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "缺少商品ID" },
        { status: 400 }
      );
    }

    // 查找原商品及其交易信息
    const originalItem = await prisma.item.findUnique({
      where: { itemId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!originalItem) {
      return NextResponse.json(
        { success: false, error: "商品不存在" },
        { status: 404 }
      );
    }

    const originalTransaction = originalItem.transactions[0];

    // 生成新的商品ID（2位字母 + 6位数字）
    const generateItemId = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const letter1 = letters[Math.floor(Math.random() * letters.length)];
      const letter2 = letters[Math.floor(Math.random() * letters.length)];
      const numbers = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      return `${letter1}${letter2}${numbers}`;
    };

    let newItemId = generateItemId();
    let attempts = 0;
    const maxAttempts = 10;
    
    // 确保新ID唯一
    while (attempts < maxAttempts) {
      const existingItem = await prisma.item.findUnique({ where: { itemId: newItemId } });
      if (!existingItem) {
        break;
      }
      newItemId = generateItemId();
      attempts++;
    }

    // 创建新的商品记录
    const newItem = await prisma.item.create({
      data: {
        itemId: newItemId,
        itemName: originalItem.itemName,
        itemNumber: originalItem.itemNumber,
        itemType: originalItem.itemType,
        itemBrand: originalItem.itemBrand,
        itemCondition: originalItem.itemCondition,
        itemRemarks: originalItem.itemRemarks,
        itemColor: originalItem.itemColor,
        itemSize: originalItem.itemSize,
        position: originalItem.position,
        warehousePositionId: originalItem.warehousePositionId,
        photos: originalItem.photos,
        accessories: originalItem.accessories,
      },
    });

    // 创建新的交易记录
    const newTransaction = await prisma.transaction.create({
      data: {
        itemId: newItemId,
        shipping: "0",
        domesticShipping: "0",
        internationalShipping: "0",
        domesticTrackingNumber: null,
        internationalTrackingNumber: null,
                      orderStatus: "在途（国内）",
        purchaseDate: originalTransaction?.purchaseDate || new Date(),
        soldDate: null,
        launchDate: null,
        purchasePlatform: "",
        soldPlatform: "",
        listingPlatforms: [],
        otherFees: [],
        purchasePrice: "0",
        purchasePriceCurrency: "CNY",
        purchasePriceExchangeRate: "1",
        soldPrice: "0",
        soldPriceCurrency: "JPY",
        soldPriceExchangeRate: "0.05",
        itemGrossProfit: "0",
        itemNetProfit: "0",
        isReturn: false,
        storageDuration: "0",
      },
    });

    // 重新验证缓存
    revalidateTag('items');
    revalidateTag('stats');
    revalidateTag('months');
    revalidateTag('warehouses');

    return NextResponse.json({
      success: true,
      message: "商品复制成功",
      data: {
        newItemId: newItem.itemId,
        newItem: newItem,
        newTransaction: newTransaction
      }
    });

  } catch (error) {
    console.error("复制商品错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "复制商品失败",
      },
      { status: 500 }
    );
  }
}
