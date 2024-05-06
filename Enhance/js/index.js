/**
 * 
 * @param {HTMLElement} elm 要计算的元素
 * @returns {Object}  
 */
function GetElementRelativeRect(elm) {
	let parentRect = elm.parentElement.getBoundingClientRect();
	let elmRect = elm.getBoundingClientRect();
	let relativeRect = {
		x: elmRect.x - parentRect.x,
		y: elmRect.y - parentRect.y,
		width: elmRect.width,
		height: elmRect.height,
	}
	return relativeRect;
}

function GetMediaGolemRect(elm) {
	let parent = elm.parentElement;
	let rect = GetElementRelativeRect(elm);
	if (elm.tagName === "VIDEO") {
		let scale = Math.min(rect.width / elm.videoWidth, rect.height / elm.videoHeight);
		let scaled_width = scale * elm.videoWidth;
		let scaled_height = scale * elm.videoHeight;
		let dx = Math.floor((rect.width - scaled_width) / 2);
		let dy = Math.floor((rect.height - scaled_height) / 2);
		rect.x += dx;
		rect.y += dy;
		rect.width = Math.floor(scaled_width);
		rect.height = Math.floor(scaled_height);
	}
	rect.process_width = Math.min(rect.width * window.devicePixelRatio, elm.width ? elm.width : elm.videoWidth);
	rect.process_height = Math.min(rect.height * window.devicePixelRatio, elm.height ? elm.width : elm.videoHeight);
	return rect;
}
/**
 * 
 * @param {HTMLMediaElement} elm 要替代的元素
 */
function CreateElementCanvasGolem(elm) {
	let golem_elm = document.createElement("canvas");
	let parent = elm.parentElement;
	if (parent.style.position == "") {
		parent.style.position = "relative";
	}
	let rect = GetMediaGolemRect(elm);
	golem_elm.style.position = "absolute";
	golem_elm.style.left = rect.x + "px";
	golem_elm.style.top = rect.y + "px";
	golem_elm.style.width = rect.width + "px";
	golem_elm.style.height = rect.height + "px";
	golem_elm.width = rect.process_width;
	golem_elm.height = rect.process_height;
	parent.replaceChild(golem_elm, elm);
	parent.insertBefore(elm, golem_elm);
	elm.style.visibility = "hidden";
	return golem_elm;
}
class VideoEnhanceGolem {
	constructor(elm) {
		this._overview_elm = elm;
		this._is_delete = false;
		this.video = elm;
		let mediaElm = elm;
		this.width = mediaElm.videoWidth ? mediaElm.videoWidth : mediaElm.width;
		this.height = mediaElm.videoHeight ? mediaElm.videoHeight : mediaElm.height;

		this.view_elm = CreateElementCanvasGolem(this._overview_elm);
		this.view_elm_ctx = this.view_elm.getContext("2d");
		this._dst_img = new cv.Mat();
		this._tag_size = new cv.Size(this.view_elm.width, this.view_elm.height);
		this._app = new ImageEnhanceFrist();
	}
	updateUi() {
		let elm = this._overview_elm;
		let golem_elm = this.view_elm;
		let rect = GetMediaGolemRect(elm);
		if (golem_elm.width === rect.process_width && golem_elm.height === rect.process_height) {
			return;
		}
		golem_elm.style.left = rect.x + "px";
		golem_elm.style.top = rect.y + "px";
		golem_elm.style.width = rect.width + "px";
		golem_elm.style.height = rect.height + "px";
		golem_elm.width = rect.process_width;
		golem_elm.height = rect.process_height;
		this._tag_size = new cv.Size(this.view_elm.width, this.view_elm.height);
	}
	__process__() {
		if (this._is_delete) {
			return;
		}
		this.updateUi();
		this.view_elm_ctx.drawImage(this.video, 0, 0, this.view_elm.width, this.view_elm.height);
		let src_img = cv.imread(this.view_elm);
		cv.cvtColor(src_img, src_img, cv.COLOR_RGBA2RGB);
		cv.resize(src_img, src_img, this._tag_size, 0, 0, cv.INTER_NEAREST);
		let app = this._app;
		let dst_img = this._dst_img;
		app.process(src_img, dst_img);
		cv.cvtColor(dst_img, dst_img, cv.COLOR_RGB2RGBA);
		cv.imshow(this.view_elm, dst_img);
		src_img.delete();
		requestAnimationFrame(() => {
			this.__process__()
		});
	}
	start() {
		this.__process__();
	}
	delete() {
		this._is_delete = true;
		this._dst_img.delete();
		this._dst_img = null;
		this._overview_elm.style.visibility = "";
		let parent = this.view_elm.parentElement;
		parent.replaceChild(this._overview_elm, this.view_elm);
	}
}

/*
{
	let script_urls = [
		"http://127.0.0.1:8848/Enhance/js/opencv.js",
		"http://127.0.0.1:8848/Enhance/js/image_process.js",
		"http://127.0.0.1:8848/Enhance/js/index.js"
	]
	script_urls.forEach((script_url)=>{
		let elm = document.createElement("script");
		elm.src = script_url;
		document.body.appendChild(elm)
	})
}

*/
{
	let enhanceApp = null;

	function Test(elm) {
		if (enhanceApp == null) {
			enhanceApp = new VideoEnhanceGolem(elm == null ? document.getElementsByTagName("video")[0] : elm);
			enhanceApp.start();
		} else {
			enhanceApp.delete();
			enhanceApp = null;
		}
	} {
		let btn = document.createElement('button');
		btn.style =
			"position: fixed; z-index:100000; right: 30px; top: 100px; width: 100px; height: 100px; background-color: cadetblue; color: white; border: none;";
		btn.innerText = "增强";
		btn.addEventListener("click", () => {
			Test()
			btn.innerText = enhanceApp == null ? "增强" : "取消增强"
		});
		document.body.appendChild(btn);
	}
}