function MeanKernelData(kernel_data) {
	let meanResult = []
	let sumValue = 0.000001;
	kernel_data.forEach((item) => {
		sumValue += item;
	})
	kernel_data.forEach((item) => {
		meanResult.push(item / sumValue);
	})
	return meanResult;
}

class ImageProcess {
	constructor() {}
	process(src_img, dst_img) {}
	delete() {}
}

class ImagePipleline extends ImageProcess {
	constructor() {
		super()
		this.treating_process = []
	}
	addProcess(p) {
		this.treating_process.push(p)
	}
	delete() {
		this.treating_process.forEach((item) => {
			item.delete();
		})
		this.treating_process.length = 0;
	}
	process(src_img, dst_img) {
		if (this.treating_process.length <= 0) return;
		if (this.treating_process.length == 1) {
			this.treating_process[0].process(src_img, dst_img);
			return;
		}
		let x = src_img === dst_img ? src_img : src_img.clone();
		let y = dst_img;
		this.treating_process.forEach((item) => {
			item.process(x, y);
			x.delete();
			x = dst_img.clone();
		})
		x.delete();
	}
}
class ImageBilateralFilter extends ImageProcess {
	constructor(d, sigmaColor, sigmaSpace, borderType = cv.BORDER_DEFAULT) {
		super()
		this.diameter = d;
		this.sigmaColor = sigmaColor;
		this.sigmaSpace = sigmaSpace;
		this.borderType = borderType;
	}
	process(src_img, dst_img) {
		if (src_img == dst_img) {
			src_img = src_img.clone();
			cv.bilateralFilter(src_img, dst_img, this.diameter, this.sigmaColor, this.sigmaSpace, this.borderType);
			src_img.delete();
		} else {
			cv.bilateralFilter(src_img, dst_img, this.diameter, this.sigmaColor, this.sigmaSpace, this.borderType);
		}
	}
}

class ImageEnhanceFilter2D extends ImageProcess {
	constructor(kernel_data, kernel_x = 5, kernel_y = 5, weight = 0.25, needMean = true) {
		super()
		kernel_data = needMean ? MeanKernelData(kernel_data) : kernel_data;
		this.kernel = cv.matFromArray(kernel_x, kernel_y, cv.CV_32FC1, kernel_data);
		this._cache_mean = new cv.Mat();
		this.weight = weight;
		this.anchor = new cv.Point(-1, -1);
	}
	delete() {
		this.kernel.delete();
		this.kernel = null;
	}
	process(src_img, dst_img) {
		cv.filter2D(src_img, this._cache_mean, -1, this.kernel, this.anchor, 0, cv.BORDER_REPLICATE);
		cv.subtract(src_img, this._cache_mean, dst_img);
		cv.addWeighted(src_img, 1.0, dst_img, this.weight, 0.0, dst_img);
	}
}
class ImageEnhanceBlock extends ImagePipleline {
	constructor(kernel_data, kernel_x = 5, kernel_y = 5, weight = 0.25, needMean = true, blur_param = null) {
		super()
		this.addProcess(new ImageEnhanceFilter2D(kernel_data, kernel_x, kernel_y, weight, needMean));
		if (blur_param) {
			this.addProcess(new ImageBilateralFilter(blur_param[0], blur_param[1], blur_param[2]))
		}
	}
}

class ImageBitwiseNot extends ImageProcess {
	constructor() {
		super();
	}
	process(src_img, dst_img) {
		cv.bitwise_not(src_img, dst_img)
	}
}

class ImageSetBrightnes extends ImageProcess
{
	constructor(brightness = 125){
		this.brightness = brightness;
		this._cache_gray = new cv.Mat();
	}
	delete(){
		this._cache_gray.delete();
		this._cache_gray = null;
	}
	process(src_img,dst_img){
		let srcBrightness = 0;
		cv.cvtColor(src_img, this._cache_gray, cv.COLOR_RGBA2GRAY);
		srcBrightness = cv.mean(this._cache_gray)[0];
		if(dst_img != src_img){
			src_img.copyTo(dst_img);
		}
		let diffBrightness = Math.max(-26, brightness - srcBrightness);
		for (let row = 0; row < dst_img.rows; row++) {
			for (let col = 0; col < dst_img.cols; col++) {
				for (let channel = 0; channel < 3; channel++) {
					let index = row * dst_img.cols * dst_img.channels() + col * dst_img.channels() +
						channel;
					let v = dst_img.data[index];
					if (diffBrightness < 0) {
						v = v - Math.pow(-diffBrightness * (v / 255), 1.5)
					} else {
						v = v + Math.pow(diffBrightness * (v / 255), 1.5)
					}
					dst_img.data[index] = Math.floor(Math.min(Math.max(0, v), 255));
				}
			}
		}
	}
}

class ImageProcessNone extends ImageProcess
{
	constructor(){
		super();
	}
	process(src_img,dst_img){
		src_img.copyTo(dst_img);
	}
}

class ImageEnhanceFrist extends ImagePipleline {
	constructor() {
		super()
		this.__init__();
	}
	__init__() {
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1,
			1, 1, 1,
			1, 1, 1,
		], 3, 3, 0.5))
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
		], 5, 5, 0.25))
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1,
			1, 1, 1,
			1, 1, 1,
		], 3, 3, 0.25))
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
		], 5, 5, 0.25))
		this.addProcess(new ImageBitwiseNot())
	}
}

class ImageEnhanceExp extends ImagePipleline {
	constructor() {
		super()
		this.__init__();
	}
	__init__() {
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			3, 3, 3,
			3, 1, 3,
			3, 3, 3,
		], 3, 3, 0.25,[3,60,60]))
		this.addProcess(new ImageEnhanceBlock([
			3, 3, 3,
			3, 1, 3,
			3, 3, 3,
		], 3, 3, 0.25,[3,60,60]))
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			3, 3, 3,
			3, 1, 3,
			3, 3, 3,
		], 3, 3, 0.5,[3,60,60]))
		this.addProcess(new ImageEnhanceBlock([
			3, 3, 3,
			3, 1, 3,
			3, 3, 3,
		], 3, 3, 0.25,[3,60,60]))
	}
}


class ImageEnhanceQuality extends ImagePipleline {
	constructor() {
		super()
		this.__init__();
	}
	__init__() {
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 0,
			1, 1, 1, 0, 0,
			1, 1, 0, 0, 0,
			1, 0, 0, 0, 0,
		], 5, 5, 0.25));
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 0, 0, 1,
			0, 0, 0, 1, 1,
			0, 0, 1, 1, 1,
			0, 1, 1, 1, 1,
			1, 1, 1, 1, 1,
		], 5, 5, 0.25));
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 1, 0, 0,
			0, 1, 1, 1, 0,
			1, 1, 1, 1, 1,
			0, 1, 1, 1, 0,
			0, 0, 1, 0, 0,
		], 5, 5, 0.25));
		this.addProcess(new ImageEnhanceBlock([
			1, 0, 1, 0, 1,
			0, 0, 1, 0, 0,
			1, 1, 1, 1, 1,
			0, 0, 1, 0, 0,
			1, 0, 1, 0, 1,
		], 5, 5, 0.25));
	}
}
class ImageEnhanceDetails extends ImagePipleline {
	constructor() {
		super()
		this.__init__();
		this._tmp = new cv.Mat();
	}
	__init__() {
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1, 0, 0,
			1, 1, 1, 0, 0,
			1, 1, 1, 0, 0,
			1, 1, 1, 0, 0,
			1, 1, 1, 0, 0
		], 5, 5, 0.125));
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 1, 1, 1,
			0, 0, 1, 1, 1,
			0, 0, 1, 1, 1,
			0, 0, 1, 1, 1,
			0, 0, 1, 1, 1
		], 5, 5, 0.125));
		this.addProcess(new ImageEnhanceBlock([
			1, 1, 1, 1, 1,
			1, 1, 1, 1, 0,
			1, 1, 1, 0, 0,
			1, 1, 0, 0, 0,
			1, 0, 0, 0, 0
		], 5, 5, 0.125));
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 0, 0, 1,
			0, 0, 0, 1, 1,
			0, 0, 1, 1, 1,
			0, 1, 1, 1, 1,
			1, 1, 1, 1, 1
		], 5, 5, 0.125));
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			1, 0, 1, 0, 1,
			0, 0, 1, 0, 0,
			1, 1, 1, 1, 1,
			0, 0, 1, 0, 0,
			1, 0, 1, 0, 1
		], 5, 5, 0.125));
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 1, 0, 0,
			0, 1, 1, 1, 0,
			1, 1, 1, 1, 1,
			0, 1, 1, 1, 0,
			0, 0, 1, 0, 0
		], 5, 5, 0.125));
		//this.addProcess(new ImageBitwiseNot())
	}
	process(src_img, dst_img) {
		//计算原始的亮度
		let origBrightness = 0;
		cv.cvtColor(src_img, this._tmp, cv.COLOR_RGBA2GRAY);
		origBrightness = cv.mean(this._tmp)[0];

		//进行标准流式处理
		super.process(src_img, dst_img);
		//获取处理后的亮度
		let dstBrightness = 0;
		cv.cvtColor(dst_img, this._tmp, cv.COLOR_RGBA2GRAY);
		dstBrightness = cv.mean(this._tmp)[0];
		//调整输出图像的亮度，进行重构，保存输出的亮度不变
		let diffBrightness = Math.max(-26, origBrightness - dstBrightness);
		for (let row = 0; row < dst_img.rows; row++) {
			for (let col = 0; col < dst_img.cols; col++) {
				for (let channel = 0; channel < 3; channel++) {
					let index = row * dst_img.cols * dst_img.channels() + col * dst_img.channels() +
						channel;
					let v = dst_img.data[index];
					if (diffBrightness < 0) {
						v = v - Math.pow(-diffBrightness * (v / 255), 1.5)
					} else {
						v = v + Math.pow(diffBrightness * (v / 255), 1.5)
					}
					dst_img.data[index] = Math.floor(Math.min(Math.max(0, v), 255));
				}
			}
		}
	}
	delete() {
		super.delete();
		this._tmp.delete();
		this._tmp = null;
	}
}


class ImageEnhance extends ImagePipleline {
	constructor() {
		super()
		this.__init__();
	}
	__init__() {
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			0, 0, 1, 0, 0,
			0, 1, 1, 1, 0,
			1, 1, 1, 1, 1,
			0, 1, 1, 1, 0,
			0, 0, 1, 0, 0,
		], 5, 5, 0.5))
		this.addProcess(new ImageBitwiseNot())
		this.addProcess(new ImageEnhanceBlock([
			1, 0, 1, 0, 1,
			0, 0, 1, 0, 0,
			1, 1, 1, 1, 1,
			0, 0, 1, 0, 0,
			1, 0, 1, 0, 1,
		], 5, 5, 0.5))
	}
}