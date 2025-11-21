/**
 * Item 名称生成工具函数
 * 根据 SKU 信息和 Item 规格自动生成 Item 名称
 */

export interface GenerateItemNameParams {
  skuName: string
  itemSize?: string | null
  itemCondition?: string | null
  variantLabel?: string | null // 变体标签（如：角色名、特殊标识等）
}

const CONDITION_MAP: Record<string, string> = {
  'NEW': '全新',
  'USED_A': '中古A',
  'USED_B': '中古B',
  'USED_C': '中古C',
}

/**
 * 生成 Item 名称
 * 格式: {SKU.name} {itemSize} {conditionLabel} {variantLabel?}
 * 示例: "AJ1 Bred 27cm 全新" 或 "AJ1 Bred 26cm 中古A 米奇"
 */
export function generateItemName(params: GenerateItemNameParams): string {
  const { skuName, itemSize, itemCondition, variantLabel } = params
  
  const parts: string[] = [skuName]
  
  // 添加尺码（如果不是均码）
  if (itemSize && itemSize.trim() && itemSize.trim() !== '均码') {
    parts.push(itemSize.trim())
  }
  
  // 添加成色（如果不是全新）
  if (itemCondition && itemCondition !== 'NEW') {
    const conditionLabel = CONDITION_MAP[itemCondition] || itemCondition
    parts.push(conditionLabel)
  }
  
  // 添加变体标签（如果有）
  if (variantLabel && variantLabel.trim()) {
    parts.push(variantLabel.trim())
  }
  
  return parts.join(' ')
}

/**
 * 获取成色显示名称
 */
export function getConditionLabel(condition: string | null | undefined): string {
  if (!condition) return '全新'
  return CONDITION_MAP[condition] || condition
}

