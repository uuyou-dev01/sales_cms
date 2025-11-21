import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface CategoryConfig {
  id: string
  name: string
  parentId?: string | null
  description?: string | null
  code?: string | null
  icon?: string | null
  color?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CategoryInput {
  name: string
  parentId?: string | null
  description?: string | null
  code?: string | null
  icon?: string | null
  color?: string | null
}

export type CategoryUpdateInput = Partial<CategoryInput>

const CATEGORY_FILE = path.join(process.cwd(), 'data', 'categories.json')

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'cat-apparel', name: '服装', parentId: null, description: '衣物、外套等' },
  { id: 'cat-shoes', name: '鞋履', parentId: null, description: '运动鞋、皮鞋等' },
  { id: 'cat-bag', name: '箱包', parentId: null, description: '背包、手提包' },
  { id: 'cat-toy', name: '潮玩', parentId: null, description: '玩具、模型与收藏' },
  { id: 'cat-electronic', name: '电子产品', parentId: null, description: '数码、配件' },
  { id: 'cat-other', name: '其他', parentId: null, description: '未归类的品类' },
]

async function ensureCategoryFile() {
  try {
    await fs.access(CATEGORY_FILE)
  } catch {
    await fs.mkdir(path.dirname(CATEGORY_FILE), { recursive: true })
    await fs.writeFile(CATEGORY_FILE, JSON.stringify(DEFAULT_CATEGORIES, null, 2), 'utf8')
  }
}

async function readRawCategories(): Promise<CategoryConfig[]> {
  await ensureCategoryFile()
  const raw = await fs.readFile(CATEGORY_FILE, 'utf8')
  try {
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data as CategoryConfig[]
  } catch (error) {
    console.error('Failed to parse categories.json:', error)
  }
  return [...DEFAULT_CATEGORIES]
}

async function writeCategories(categories: CategoryConfig[]) {
  await fs.mkdir(path.dirname(CATEGORY_FILE), { recursive: true })
  const normalized = categories
    .filter((cat) => !!cat && !!cat.id && !!cat.name)
    .map((cat) => ({ ...cat, parentId: cat.parentId ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  await fs.writeFile(CATEGORY_FILE, JSON.stringify(normalized, null, 2), 'utf8')
}

export async function getCategories() {
  return readRawCategories()
}

export async function createCategory(payload: CategoryInput) {
  const categories = await readRawCategories()
  const now = new Date().toISOString()
  const category: CategoryConfig = {
    id: randomUUID(),
    name: payload.name.trim(),
    parentId: payload.parentId ?? null,
    description: payload.description ?? null,
    code: payload.code ?? null,
    icon: payload.icon ?? null,
    color: payload.color ?? null,
    createdAt: now,
    updatedAt: now,
  }
  categories.push(category)
  await writeCategories(categories)
  return category
}

export async function updateCategory(id: string, payload: CategoryUpdateInput) {
  const categories = await readRawCategories()
  const index = categories.findIndex((cat) => cat.id === id)
  if (index === -1) throw new Error('CATEGORY_NOT_FOUND')
  const now = new Date().toISOString()
  categories[index] = {
    ...categories[index],
    name: payload.name?.trim() || categories[index].name,
    parentId: payload.parentId ?? null,
    description: payload.description ?? categories[index].description,
    code: payload.code ?? categories[index].code,
    icon: payload.icon ?? categories[index].icon,
    color: payload.color ?? categories[index].color,
    updatedAt: now,
  }
  await writeCategories(categories)
  return categories[index]
}

export async function deleteCategory(id: string) {
  const categories = await readRawCategories()
  const filtered = categories.filter((cat) => cat.id !== id)
  if (filtered.length === categories.length) throw new Error('CATEGORY_NOT_FOUND')
  const normalized = filtered.map((cat) => (cat.parentId === id ? { ...cat, parentId: null } : cat))
  await writeCategories(normalized)
}
