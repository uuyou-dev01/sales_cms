import { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintLabelProps {
  itemId: string;
  itemName: string;
  itemCondition: string;
  itemSize: string;
  itemNumber: string;
  purchasePrice: string;
  purchasePlatform: string;
  itemType: string;
  itemRemarks: string;
  purchaseDate: string;
}

export const PrintLabel = forwardRef<HTMLDivElement, PrintLabelProps>(
  ({ 
    itemId, 
    itemName, 
    itemCondition, 
    itemSize, 
    itemNumber, 
    purchasePrice,
    purchasePlatform,
    itemType,
    itemRemarks,
    purchaseDate
  }, ref) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // 生成二维码
    useEffect(() => {
      const generateQRCode = async () => {
        try {
          // 生成一个链接，扫描后可以直接进入系统查看这条数据
          const qrData = `${window.location.origin}/item/${itemId}`;
          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 80,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('生成二维码失败:', error);
        }
      };

      if (itemId) {
        generateQRCode();
      }
    }, [itemId]);

    // 等待二维码生成完成
    const isQRCodeReady = qrCodeDataUrl !== '';

    return (
      <div ref={ref} className="print-content" style={{ 
        width: '100mm',
        height: '70mm',
        margin: 0,
        padding: '3mm',
        fontFamily: 'Microsoft YaHei, Arial, sans-serif',
        backgroundColor: 'white'
      }}>
        <div className="label-container" style={{
          border: '2px solid #000',
          padding: '2mm',
          height: '64mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: 'white'
        }}>
          {/* 标题区域 */}
          <div className="label-header" style={{
            textAlign: 'center',
            borderBottom: '1px solid #000',
            paddingBottom: '1mm',
            marginBottom: '1mm'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '12pt', 
              fontWeight: 'bold',
              lineHeight: '1.2'
            }}>
              {itemName || '商品名称'}
            </h2>
            <div className="label-id" style={{ 
              fontSize: '8pt', 
              color: 'black', 
              marginTop: '0.5mm',
              fontWeight: 'bold'
            }}>
              ID: {itemId || 'N/A'}
            </div>
          </div>
          
          {/* 商品信息区域 */}
          <div className="item-info" style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5mm',
            fontSize: '7pt',
            marginBottom: '1mm'
          }}>
            {/* 第一列 */}
            <div className="info-column">
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>型号:</span>
                <span className="value" style={{ flex: 1, fontSize: '6pt' }}>
                  {itemNumber || 'N/A'}
                </span>
              </div>
              
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>类型:</span>
                <span className="value" style={{ flex: 1, fontSize: '6pt' }}>
                  {itemType || 'N/A'}
                </span>
              </div>
              
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>尺寸:</span>
                <span className="value" style={{ flex: 1, fontSize: '6pt' }}>
                  {itemSize || 'N/A'}
                </span>
              </div>
              
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>成色:</span>
                <span className="value" style={{ flex: 1, fontSize: '6pt' }}>
                  {itemCondition || 'N/A'}
                </span>
              </div>
            </div>
            
            {/* 第二列 */}
            <div className="info-column">
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>购入日期:</span>
                <span className="value" style={{ flex: 1, fontSize: '6pt' }}>
                  {purchaseDate || 'N/A'}
                </span>
              </div>
              
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>购入价格:</span>
                <span className="value price" style={{ 
                  flex: 1, 
                  color: '#e53e3e', 
                  fontWeight: 'bold',
                  fontSize: '6pt'
                }}>
                  ¥{purchasePrice || 'N/A'}
                </span>
              </div>
              
              <div className="info-row" style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '0.5mm'
              }}>
                <span className="label" style={{ 
                  fontWeight: 'bold', 
                  marginRight: '1mm', 
                  minWidth: '8mm',
                  fontSize: '6pt'
                }}>购入平台:</span>
                <span className="purchase-platform" style={{ 
                  flex: 1, 
                  color: '#e53e3e', 
                  fontWeight: 'bold',
                  fontSize: '6pt'
                }}>
                  {purchasePlatform || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 上架平台和备注区域 */}
          <div className="platform-remarks" style={{
            marginBottom: '1mm'
          }}>
            <div className="info-row" style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '0.5mm'
            }}>
              <span className="label" style={{ 
                fontWeight: 'bold', 
                marginRight: '1mm', 
                minWidth: '12mm',
                fontSize: '6pt'
              }}>上架平台:</span>
              <span className="launch-platform" style={{ 
                flex: 1, 
                color: 'black', 
                fontWeight: 'bold',
                fontSize: '6pt'
              }}>
                雅虎 乐天 煤炉 SD STOCKX
              </span>
            </div>
            
            <div className="info-row" style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '0.5mm'
            }}>
              <span className="label" style={{ 
                fontWeight: 'bold', 
                marginRight: '1mm', 
                minWidth: '12mm',
                fontSize: '6pt'
              }}>备注:</span>
              <span className="remarks" style={{ 
                flex: 1, 
                color: 'black', 
                fontWeight: 'bold',
                fontSize: '6pt'
              }}>
                {itemRemarks || '无'}
              </span>
            </div>
          </div>
          
          {/* 底部区域 - 二维码和打印时间 */}
          <div className="label-footer" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #000',
            paddingTop: '1mm',
            marginTop: '1mm',
            fontSize: '6pt'
          }}>
            {/* 二维码 */}
            <div className="qr-code" style={{
              width: '20mm',
              height: '20mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isQRCodeReady ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  style={{
                    width: '18mm',
                    height: '18mm',
                    border: '1px solid #ccc'
                  }}
                  onLoad={() => console.log('二维码图片加载完成')}
                  onError={(e) => console.error('二维码图片加载失败:', e)}
                />
              ) : (
                <div style={{
                  width: '18mm',
                  height: '18mm',
                  border: '1px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '5pt',
                  textAlign: 'center'
                }}>
                  生成中...
                </div>
              )}
            </div>
            
            {/* 打印时间 */}
            <div className="print-date" style={{ 
              color: '#666',
              textAlign: 'right',
              fontSize: '5pt'
            }}>
              <div>打印时间:</div>
              <div>{new Date().toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintLabel.displayName = 'PrintLabel'; 