import { forwardRef } from 'react';

interface PrintLabelProps {
  itemId: string;
  itemName: string;
  itemCondition: string;
  itemSize: string;
  itemBrand: string;
  itemNumber: string;
  purchasePrice: string;
  itemColor: string;
  itemType: string;
  itemMfgDate: string;
  purchaseDate: string;
  itemStatus: string;
}

export const PrintLabel = forwardRef<HTMLDivElement, PrintLabelProps>(
  ({ 
    itemId, 
    itemName, 
    itemCondition, 
    itemSize, 
    itemBrand, 
    itemNumber, 
    purchasePrice,
    itemColor,
    itemType,
    itemMfgDate,
    purchaseDate,
    itemStatus
  }, ref) => {
    return (
      <div ref={ref} className="print-content" style={{ 
        width: '100mm',
        height: '60mm',
        margin: 0,
        padding: '5mm',
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
      }}>
        <div className="label-container" style={{
          border: '2px solid #000',
          padding: '3mm',
          height: '50mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div className="label-header" style={{
            textAlign: 'center',
            borderBottom: '1px solid #000',
            paddingBottom: '2mm',
            marginBottom: '2mm'
          }}>
            <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>商品标签</h2>
            <div className="label-id" style={{ fontSize: '10pt', color: '#666', marginTop: '1mm' }}>ID: {itemId}</div>
          </div>
          
          <div className="item-info" style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1mm',
            fontSize: '9pt'
          }}>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>品名:</span>
              <span className="value" style={{ flex: 1 }}>{itemName}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>品牌:</span>
              <span className="value" style={{ flex: 1 }}>{itemBrand}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>型号:</span>
              <span className="value" style={{ flex: 1 }}>{itemNumber}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>类型:</span>
              <span className="value" style={{ flex: 1 }}>{itemType}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>尺寸:</span>
              <span className="value" style={{ flex: 1 }}>{itemSize}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>颜色:</span>
              <span className="value" style={{ flex: 1 }}>{itemColor}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>成色:</span>
              <span className="value" style={{ flex: 1 }}>{itemCondition}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>状态:</span>
              <span className="value" style={{ flex: 1 }}>{itemStatus}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>生产日期:</span>
              <span className="value" style={{ flex: 1 }}>{itemMfgDate}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>购入日期:</span>
              <span className="value" style={{ flex: 1 }}>{purchaseDate}</span>
            </div>
            <div className="info-row" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="label" style={{ fontWeight: 'bold', marginRight: '2mm', minWidth: '20mm' }}>购入价格:</span>
              <span className="value price" style={{ flex: 1, color: '#e53e3e', fontWeight: 'bold' }}>¥{purchasePrice}</span>
            </div>
          </div>
          
          <div className="label-footer" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #000',
            paddingTop: '2mm',
            marginTop: '2mm',
            fontSize: '8pt'
          }}>
            <div className="qr-placeholder" style={{
              border: '1px dashed #ccc',
              padding: '2mm',
              textAlign: 'center',
              color: '#999'
            }}>
              [二维码占位符]
            </div>
            <div className="print-date" style={{ color: '#666' }}>
              打印时间: {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintLabel.displayName = 'PrintLabel'; 