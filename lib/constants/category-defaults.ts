export interface CategorySeed {
  name: string
  code?: string
  children?: CategorySeed[]
}

export const CATEGORY_SEED_DATA: CategorySeed[] = [
  {
    name: '服装',
    code: 'CLOTHING',
    children: [
      { name: '上衣' },
      { name: '下装' },
      { name: '外套' },
    ],
  },
  {
    name: '鞋子',
    code: 'SHOES',
    children: [
      { name: '运动鞋' },
      { name: '潮鞋' },
      { name: '正装鞋' },
    ],
  },
  {
    name: '包包',
    code: 'BAGS',
    children: [
      { name: '双肩包' },
      { name: '单肩包' },
      { name: '配件小包' },
    ],
  },
  {
    name: '配饰',
    code: 'ACCESSORIES',
  },
  {
    name: '3C&配件',
    code: 'ELECTRONICS',
  },
  {
    name: '潮玩类',
    code: 'TOYS',
    children: [
      { name: '手办' },
      { name: '盲盒' },
      { name: '模型' },
    ],
  },
  {
    name: '其他',
    code: 'OTHER',
  },
]

