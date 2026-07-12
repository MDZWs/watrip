const PhotoUpload = {
    maxWidth: 1200,
    quality: 0.8,
    maxCount: 3,

    async selectAndCompress() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) {
                    resolve([]);
                    return;
                }
                const results = [];
                for (const file of files) {
                    try {
                        const compressed = await this.compressImage(file);
                        results.push(compressed);
                    } catch (err) {
                        console.error('图片压缩失败:', err);
                    }
                }
                resolve(results);
            };
            input.click();
        });
    },

    async selectCamera() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                    resolve(null);
                    return;
                }
                try {
                    const compressed = await this.compressImage(file);
                    resolve(compressed);
                } catch (err) {
                    console.error('拍照压缩失败:', err);
                    resolve(null);
                }
            };
            input.click();
        });
    },

    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > this.maxWidth) {
                        height = Math.round(height * (this.maxWidth / width));
                        width = this.maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', this.quality);
                    resolve({
                        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        dataUrl: dataUrl,
                        isCover: false,
                        width: width,
                        height: height
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

window.PhotoUpload = PhotoUpload;
