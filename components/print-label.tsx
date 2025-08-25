import { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintLabelProps {
  itemId: string;
  itemName: string;
  itemRemarks: string;
}

export const PrintLabel = forwardRef<HTMLDivElement, PrintLabelProps>(
  ({ 
    itemId, 
    itemName, 
    itemRemarks
  }, ref) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // 生成二维码
    useEffect(() => {
      const generateQRCode = async () => {
        try {
          // 生成一个链接，扫描后可以直接进入系统查看这条数据
          const qrData = `${window.location.origin}/item/${itemId}`;
          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 60,
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
        width: '57mm',
        height: '30mm',
        margin: 0,
        padding: '0.5mm',
        fontFamily: 'Microsoft YaHei, Arial, sans-serif',
        backgroundColor: 'white'
      }}>
        <div className="label-container" style={{
          border: '0.5px solid #000',
          padding: '1mm',
          height: '28mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: 'white'
        }}>
          {/* 标题区域 */}
          <div className="label-header" style={{
            textAlign: 'center',
            paddingBottom: '0.5mm',
            borderBottom: '0.5px solid #eee'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '8pt', 
              fontWeight: 'bold',
              lineHeight: '1.1',
              maxHeight: '8mm',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {itemName || '商品名称'}
            </h2>
            <div className="label-id" style={{ 
              fontSize: '6pt', 
              color: '#666', 
              marginTop: '0.3mm',
              fontWeight: 'normal'
            }}>
              ID: {itemId || 'N/A'}
            </div>
          </div>
          
          {/* 上架平台和备注区域 */}
          <div className="platform-remarks" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '1mm 0'
          }}>
            <div className="info-row" style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '1mm'
            }}>
              <span className="label" style={{ 
                fontWeight: 'bold', 
                marginRight: '0.5mm', 
                minWidth: '8mm',
                fontSize: '7pt'
              }}>上架:</span>
              <span className="launch-platform" style={{ 
                flex: 1, 
                color: 'black', 
                fontWeight: 'normal',
                fontSize: '7pt'
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
                marginRight: '0.5mm', 
                minWidth: '8mm',
                fontSize: '7pt'
              }}>备注:</span>
              <span className="remarks" style={{ 
                flex: 1, 
                color: 'black', 
                fontWeight: 'normal',
                fontSize: '7pt',
                maxHeight: '6mm',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
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
            fontSize: '5pt',
            borderTop: '0.5px solid #eee',
            paddingTop: '0.3mm'
          }}>
            {/* 二维码 */}
            <div className="qr-code" style={{
              width: '12mm',
              height: '12mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isQRCodeReady ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code" 
                  style={{
                    width: '10mm',
                    height: '10mm',
                    border: '0.5px solid #ccc'
                  }}
                  onLoad={() => console.log('二维码图片加载完成')}
                  onError={(e) => console.error('二维码图片加载失败:', e)}
                />
              ) : (
                <div style={{
                  width: '10mm',
                  height: '10mm',
                  border: '0.5px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '4pt',
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
              fontSize: '4pt',
              lineHeight: '1.1'
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