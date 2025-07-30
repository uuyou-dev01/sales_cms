# Shop CMS - 商品管理系统

一个基于 Next.js 15 和 Prisma 的现代化商品管理系统，支持动态路由和月份筛选功能。

## 🚀 技术栈

- **前端框架**: Next.js 15 (App Router)
- **UI组件**: shadcn/ui + Tailwind CSS
- **数据库**: Prisma + SQLite
- **图标**: Lucide React
- **类型安全**: TypeScript

## 📁 项目结构

```
shop_cms/
├── app/
│   ├── api/                    # API 路由
│   │   ├── items/             # 商品相关API
│   │   │   ├── list/          # 获取商品列表
│   │   │   ├── create/        # 创建商品
│   │   │   ├── update/        # 更新商品
│   │   │   ├── delete/        # 删除商品
│   │   │   ├── months/        # 获取月份列表
│   │   │   └── stats/         # 获取统计数据
│   │   └── csv/               # CSV上传相关API
│   ├── sales/                 # 销售管理页面
│   │   ├── layout.tsx         # 销售页面布局
│   │   ├── page.tsx           # 全部销售数据页面
│   │   └── [month]/           # 动态路由 - 月份筛选
│   │       └── page.tsx       # 特定月份数据页面
│   ├── test/                  # 测试页面
│   ├── layout.tsx             # 根布局
│   └── page.tsx               # 根页面（重定向到/sales）
├── components/                # React组件
│   ├── ui/                    # shadcn/ui组件
│   ├── app-sidebar.tsx        # 应用侧边栏
│   └── ...                    # 其他业务组件
├── lib/                       # 工具库
├── prisma/                    # 数据库配置
└── public/                    # 静态资源
```

## 🎯 核心功能

### 1. 动态路由系统
- **全部数据**: `/sales` - 显示所有商品数据
- **月份筛选**: `/sales/[month]` - 显示特定月份的数据
  - 例如: `/sales/2024-06` 显示2024年6月的数据
  - 支持格式: `YYYY-MM`

### 2. 智能导航
- 侧边栏自动获取可用月份
- 动态生成月份导航链接
- 支持返回全部数据功能

### 3. 数据统计
- 实时计算各月份统计数据
- 支持购入金额、销售额、利润等指标
- 按月份筛选的精确统计

### 4. 批量导入功能
- **CSV文件支持**: 支持标准CSV格式文件导入
- **智能验证**: 自动验证文件格式和必需字段
- **进度显示**: 实时显示导入进度和状态
- **错误处理**: 详细的错误报告和成功统计
- **重复检查**: 防止重复导入相同商品ID
- **模板下载**: 提供标准CSV模板供用户参考

### 5. 智能搜索功能
- **多字段搜索**: 支持商品名称、ID、品牌、类型、尺寸搜索
- **模糊匹配**: 智能模糊搜索，提高查找效率
- **实时搜索**: 搜索结果实时更新
- **组合筛选**: 搜索条件与状态筛选器组合使用

### 6. 现代化UI
- 响应式设计
- 卡片式布局
- 丰富的图标和色彩
- 悬停效果和过渡动画

## 🛠️ 开发指南

### 安装依赖
```bash
npm install
```

### 数据库设置
```bash
npx prisma generate
npx prisma db push
```

### 启动开发服务器
```bash
npm run dev
```

### 访问应用
- 主页面: http://localhost:3000
- 测试页面: http://localhost:3000/test
- API文档: http://localhost:3000/api/items

## 📊 API 接口

### 商品管理
- `GET /api/items/list` - 获取商品列表
- `POST /api/items/create` - 创建商品
- `PUT /api/items/update` - 更新商品
- `DELETE /api/items/delete` - 删除商品

### 数据统计
- `GET /api/items/stats` - 获取统计数据
- `GET /api/items/months` - 获取月份列表

### 批量导入
- `POST /api/items/batch-import` - 批量导入CSV文件

### 查询参数
- `page`: 页码
- `pageSize`: 每页数量
- `status`: 商品状态筛选
- `start`: 开始日期 (YYYY-MM-DD)
- `end`: 结束日期 (YYYY-MM-DD)
- `search`: 搜索关键词 (支持商品名称、ID、品牌、类型、尺寸)

## 🎨 UI 组件

### 状态标签
- 已完成: 绿色 ✓
- 进行中: 黄色 ⏳
- 已取消: 红色 ✗

### 统计卡片
- 购入: 蓝色购物车图标
- 销售: 绿色趋势图标
- 利润: 紫色美元图标
- 利润率: 橙色趋势图标
- 库存: 靛蓝包裹图标

## 🔄 路由示例

```
/sales                    # 全部销售数据
/sales/2024-01           # 2024年1月数据
/sales/2024-06           # 2024年6月数据
/sales/2024-12           # 2024年12月数据
```

## 📝 更新日志

### v2.1.0 - 批量导入和搜索功能
- ✅ 新增批量导入CSV功能
- ✅ 实现智能搜索功能
- ✅ 优化错误处理和进度显示
- ✅ 新增测试页面

### v2.0.0 - 动态路由重构
- ✅ 重构为 Next.js 15 App Router
- ✅ 实现动态路由 `/sales/[month]`
- ✅ 优化侧边栏导航
- ✅ 新增统计API
- ✅ 现代化UI设计
- ✅ 响应式布局

### v1.0.0 - 基础功能
- ✅ 商品CRUD操作
- ✅ 基础数据统计
- ✅ 文件上传功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License
