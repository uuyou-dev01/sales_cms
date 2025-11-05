import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Upload, Download, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  previewClassName?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  label = "图片",
  previewClassName = "w-32 h-32"
}: ImageUploadProps) {
  const [urlInput, setUrlInput] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange(base64String);
        setUrlInput(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    onChange(urlInput);
  };

  const handleDownload = async () => {
    try {
      // 如果是base64图片，直接下载
      if (value.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = value;
        link.download = `image-${Date.now()}.png`;
        link.click();
      } else {
        // 如果是URL，需要fetch然后下载
        const response = await fetch(value);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">
            <Link className="w-4 h-4 mr-2" />
            URL
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            本地上传
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="输入图片URL..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlSubmit();
                }
              }}
            />
            <Button onClick={handleUrlSubmit} variant="outline">
              应用
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            选择图片
          </Button>
        </TabsContent>
      </Tabs>

      {value && (
        <div className="space-y-2">
          <ImageWithFallback
            src={value}
            alt="预览"
            className={`${previewClassName} object-cover rounded border`}
          />
          <Button 
            onClick={handleDownload} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            下载图片
          </Button>
        </div>
      )}
    </div>
  );
}
