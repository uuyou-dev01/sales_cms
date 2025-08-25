// 测试导出API的简单脚本
const testExportAPI = async () => {
  try {
    console.log('🧪 开始测试导出API...');
    
    // 测试导出全部数据
    const response = await fetch('http://localhost:3000/api/items/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        monthFilter: 'all'
      }),
    });

    if (response.ok) {
      const blob = await response.blob();
      console.log('✅ 导出成功！');
      console.log('📊 响应状态:', response.status);
      console.log('📁 内容类型:', response.headers.get('content-type'));
      console.log('📄 文件名:', response.headers.get('content-disposition'));
      console.log('📏 文件大小:', blob.size, 'bytes');
      
      // 检查CSV内容
      const text = await blob.text();
      const lines = text.split('\n');
      console.log('📋 CSV行数:', lines.length);
      console.log('🏷️ 表头:', lines[0]);
      
      if (lines.length > 1) {
        console.log('📝 第一行数据:', lines[1]);
      }
    } else {
      console.error('❌ 导出失败:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('📄 错误详情:', errorText);
    }
  } catch (error) {
    console.error('💥 测试出错:', error.message);
  }
};

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  console.log('🚀 请在浏览器中运行此测试');
} else {
  // 在浏览器中运行
  testExportAPI();
}
