import pandas as pd
import re
from datetime import datetime
import numpy as np

def clean_date(date_str):
    """清理和标准化日期格式"""
    if pd.isna(date_str) or date_str == '#VALUE!' or date_str == '':
        return ''
    
    date_str = str(date_str).strip()
    
    # 处理 "2月27日" 格式
    if '月' in date_str and '日' in date_str:
        month_match = re.search(r'(\d+)月', date_str)
        day_match = re.search(r'(\d+)日', date_str)
        if month_match and day_match:
            month = month_match.group(1)
            day = day_match.group(1)
            # 假设是2023年
            return f"2023-{month.zfill(2)}-{day.zfill(2)}"
    
    # 处理 "2024/1/22" 格式
    if '/' in date_str:
        try:
            date_obj = datetime.strptime(date_str, '%Y/%m/%d')
            return date_obj.strftime('%Y-%m-%d')
        except:
            pass
    
    # 处理 "2024-1-22" 格式
    if '-' in date_str:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%Y-%m-%d')
        except:
            pass
    
    return date_str

def clean_price(price_str):
    """清理价格数据"""
    if pd.isna(price_str) or price_str == '#VALUE!' or price_str == '':
        return '0'
    
    price_str = str(price_str).strip()
    
    # 移除百分比符号
    if '%' in price_str:
        return '0'
    
    # 移除逗号
    price_str = price_str.replace(',', '')
    
    # 尝试转换为数字
    try:
        price = float(price_str)
        return str(price)
    except:
        return '0'

def clean_text(text):
    """清理文本数据"""
    if pd.isna(text) or text == '#VALUE!' or text == '':
        return ''
    return str(text).strip()

def process_csv():
    # 读取原始CSV文件
    df = pd.read_csv('files/导入表.csv')
    
    print(f"原始数据行数: {len(df)}")
    print(f"原始数据列数: {len(df.columns)}")
    
    # 创建新的数据框，按照我们的模板格式
    new_data = []
    
    for index, row in df.iterrows():
        # 清理和转换数据
        item_name = clean_text(row.get('itemName', ''))
        item_number = clean_text(row.get('itemNumber', ''))
        item_type = clean_text(row.get('itemType', ''))
        item_brand = clean_text(row.get('itemBrand', ''))
        item_condition = clean_text(row.get('itemCondition', ''))
        item_size = clean_text(row.get('itemSize', ''))
        item_color = clean_text(row.get('itemColor', ''))
        item_remarks = clean_text(row.get('itemRemarks', ''))
        item_status = clean_text(row.get('itemStatus', ''))
        item_mfg_date = clean_text(row.get('itemMfgDate', ''))
        
        # 位置和仓库信息
        position = clean_text(row.get('position', ''))
        warehouse_name = clean_text(row.get('warehouseName', ''))
        warehouse_description = clean_text(row.get('warehouseDescription', ''))
        position_name = clean_text(row.get('positionName', ''))
        position_capacity = clean_text(row.get('positionCapacity', '30'))
        
        # 照片
        photos = clean_text(row.get('photos', ''))
        
        # 购买信息
        purchase_date = clean_date(row.get('purchaseDate', ''))
        purchase_price = clean_price(row.get('purchasePrice', ''))
        purchase_platform = clean_text(row.get('purchasePlatform', ''))
        purchase_price_currency = clean_text(row.get('purchasePriceCurrency', 'CNY'))
        purchase_price_exchange_rate = clean_text(row.get('purchasePriceExchangeRate', '1'))
        
        # 上架和售出信息
        launch_date = clean_date(row.get('launchDate', ''))
        sold_date = clean_date(row.get('soldDate', ''))
        sold_price = clean_price(row.get('soldPrice', ''))
        sold_platform = clean_text(row.get('soldPlatform', ''))
        sold_price_currency = clean_text(row.get('soldPriceCurrency', 'JPY'))
        sold_price_exchange_rate = clean_text(row.get('soldPriceExchangeRate', '0.05'))
        
        # 利润信息
        item_gross_profit = clean_price(row.get('itemGrossProfit', ''))
        item_net_profit = clean_price(row.get('itemNetProfit', ''))
        
        # 运费和状态
        shipping = clean_price(row.get('shipping', ''))
        transaction_statues = clean_text(row.get('transactionStatues', item_status))
        is_return = clean_text(row.get('isReturn', 'no'))
        storage_duration = clean_price(row.get('storageDuration', '0'))
        
        # 运费详情
        domestic_shipping = clean_price(row.get('domesticShipping', '0'))
        international_shipping = clean_price(row.get('internationalShipping', '0'))
        domestic_tracking_number = clean_text(row.get('domesticTrackingNumber', ''))
        international_tracking_number = clean_text(row.get('internationalTrackingNumber', ''))
        
        # 上架平台
        listing_platforms = clean_text(row.get('listingPlatforms', ''))
        
        # 其他费用
        other_fees = clean_text(row.get('otherFees', ''))
        
        # 创建新行数据
        new_row = {
            'itemName': item_name,
            'itemNumber': item_number,
            'itemType': item_type,
            'itemBrand': item_brand,
            'itemCondition': item_condition,
            'itemSize': item_size,
            'itemColor': item_color,
            'itemRemarks': item_remarks,
            'itemStatus': item_status,
            'itemMfgDate': item_mfg_date,
            'position': position,
            'warehouseName': warehouse_name,
            'warehouseDescription': warehouse_description,
            'positionName': position_name,
            'positionCapacity': position_capacity,
            'photos': photos,
            'purchaseDate': purchase_date,
            'purchasePrice': purchase_price,
            'purchasePlatform': purchase_platform,
            'purchasePriceCurrency': purchase_price_currency,
            'purchasePriceExchangeRate': purchase_price_exchange_rate,
            'launchDate': launch_date,
            'soldDate': sold_date,
            'soldPrice': sold_price,
            'soldPlatform': sold_platform,
            'soldPriceCurrency': sold_price_currency,
            'soldPriceExchangeRate': sold_price_exchange_rate,
            'itemGrossProfit': item_gross_profit,
            'itemNetProfit': item_net_profit,
            'shipping': shipping,
            'transactionStatues': transaction_statues,
            'isReturn': is_return,
            'storageDuration': storage_duration,
            'domesticShipping': domestic_shipping,
            'internationalShipping': international_shipping,
            'domesticTrackingNumber': domestic_tracking_number,
            'internationalTrackingNumber': international_tracking_number,
            'listingPlatforms': listing_platforms,
            'otherFees': other_fees
        }
        
        new_data.append(new_row)
    
    # 创建新的数据框
    new_df = pd.DataFrame(new_data)
    
    # 保存处理后的文件
    output_file = 'files/导入表_处理后.csv'
    new_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"处理完成！输出文件: {output_file}")
    print(f"处理后数据行数: {len(new_df)}")
    print(f"处理后数据列数: {len(new_df.columns)}")
    
    # 显示前几行数据
    print("\n前5行数据预览:")
    print(new_df.head())
    
    # 显示数据统计
    print("\n数据统计:")
    print(f"有效商品名称: {new_df['itemName'].notna().sum()}")
    print(f"有效购买日期: {new_df['purchaseDate'].notna().sum()}")
    print(f"有效购买价格: {new_df['purchasePrice'].notna().sum()}")

if __name__ == "__main__":
    process_csv()
