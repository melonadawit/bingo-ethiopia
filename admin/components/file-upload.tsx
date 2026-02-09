'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Loader2, UploadCloud, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
    onUpload: (url: string) => void;
    currentUrl?: string;
    bucketName?: string;
    icon?: any;
    label?: string;
}

export function FileUpload({ onUpload, currentUrl, bucketName = 'marketing-assets', icon: Icon = UploadCloud, label = "Upload File" }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            onUpload(data.publicUrl);
            toast.success('File uploaded successfully!');
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*"
            />

            {currentUrl ? (
                <div className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs w-full overflow-hidden">
                    <div className="truncate flex-1 text-blue-500 underline" title={currentUrl}>
                        <a href={currentUrl} target="_blank" rel="noopener noreferrer">{currentUrl.split('/').pop()}</a>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => onUpload('')}>
                        <XCircle className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-white/20 text-muted-foreground hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icon className="w-4 h-4 mr-2" />}
                    {uploading ? 'Uploading...' : label}
                </Button>
            )}
        </div>
    );
}
