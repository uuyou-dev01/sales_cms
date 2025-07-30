import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import pandas as pd

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def load_training_data():
    """从数据库加载训练数据"""
    query = """
    SELECT 
        i.itemType,
        i.itemBrand,
        i.itemCondition,
        i.itemSize,
        i.itemColor,
        t.purchasePrice,
        t.soldPrice,
        t.purchasePriceCurrency,
        t.soldPriceCurrency
    FROM "Item" i
    JOIN "Transaction" t ON i."itemId" = t."itemId"
    WHERE t."soldPrice" IS NOT NULL
    """
    
    df = pd.read_sql(query, engine)
    
    # 统一货币（转换为人民币）
    df['purchasePrice'] = df.apply(
        lambda x: float(x['purchasePrice']) * get_exchange_rate(x['purchasePriceCurrency']),
        axis=1
    )
    df['soldPrice'] = df.apply(
        lambda x: float(x['soldPrice']) * get_exchange_rate(x['soldPriceCurrency']),
        axis=1
    )
    
    return df

def get_exchange_rate(currency):
    """获取汇率"""
    rates = {
        'CNY': 1.0,
        'JPY': 0.048,  # 示例汇率
        'USD': 7.2     # 示例汇率
    }
    return rates.get(currency, 1.0) 