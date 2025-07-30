import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PricePredictionProps {
  itemData: {
    itemType: string;
    itemBrand: string;
    itemCondition: string;
    purchasePrice: string;
    itemSize?: string;
    itemColor?: string;
  };
}

export function PricePrediction({ itemData }: PricePredictionProps) {
  const { toast } = useToast();
  const [prediction, setPrediction] = React.useState<{
    predicted_price: number;
    confidence_interval: number[];
    similar_items: any[];
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const getPrediction = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/predict_price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...itemData,
          purchasePrice: parseFloat(itemData.purchasePrice),
        }),
      });

      if (!response.ok) {
        throw new Error('预测失败');
      }

      const data = await response.json();
      setPrediction(data);
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "预测失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          onClick={() => getPrediction()}
          disabled={loading}
        >
          {loading ? "分析中..." : "智能定价分析"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>价格预测结果</DialogTitle>
        </DialogHeader>
        {prediction && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">建议售价</h4>
              <p className="text-2xl font-bold text-green-600">
                ¥ {prediction.predicted_price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                价格区间: ¥{prediction.confidence_interval[0].toFixed(2)} - 
                ¥{prediction.confidence_interval[1].toFixed(2)}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">相似商品参考</h4>
              <div className="space-y-2">
                {prediction.similar_items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <p>{item.itemName}</p>
                    <p className="text-gray-500">
                      售价: ¥{parseFloat(item.soldPrice).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 