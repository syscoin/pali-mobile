import { Platform } from 'react-native';

const getWebviewUrl = `
	const __getFavicon = function(){
		let favicon = undefined;
		const nodeList = document.getElementsByTagName("link");
		for (let i = 0; i < nodeList.length; i++)
		{
			const rel = nodeList[i].getAttribute("rel")
			if (rel === "icon" || rel === "shortcut icon")
			{
				favicon = nodeList[i]
			}
		}
		return favicon && favicon.href
	}
	window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
		{
			type: 'GET_WEBVIEW_URL',
			payload: {
				url: location.href,
				icon: __getFavicon()
			}
		}
	))
`;

export const JS_WEBVIEW_URL = `
	(function () {
		${getWebviewUrl}
	})();
`;

export const JS_SET_PLATFORM = function() {
	const platform = Platform.OS;
	return `(function () { window.localStorage.setItem('platform', '${platform}'); })()`;
};

export const JS_ANDROID_LONGPRESS_LOADEND = `
	(function() {
            function wrap(fn) {
                return function wrapper() {
                    var res = fn.apply(this, arguments);
                    window.ReactNativeWebView.postMessage(JSON.stringify({type : 'NAVIGATION_STATE_CHANGED'}));
                return res;
                }
            }
            history.pushState = wrap(history.pushState);
            history.replaceState = wrap(history.replaceState);
            window.addEventListener('popstate', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({type : 'NAVIGATION_STATE_CHANGED'}));
            });
        })();
    (function() {
		function setupLongPress() {
			var imgsItems = document.getElementsByTagName('img');
			for(var i=0; i < imgsItems.length; i++){
				var node = imgsItems[i];
				var longpress = false, presstimer = null, longtarget = null;
				var cancel = function(e){
					if(presstimer !== null){
						clearTimeout(presstimer);
						presstimer = null;
					}
				}
				var click = function(e){
					if(presstimer !== null){
						clearTimeout(presstimer);
						presstimer = null;
					}
					if(longpress){
						return false;
					}
				}
				var start = function(e){
					if(e.type === 'click' && e.button !== 0){
						return;
					}
					longpress = false;
					if(presstimer === null){
						presstimer = setTimeout(function(){
							var src = e.target.getAttribute('src');
							if(src && src != ''){
								window.ReactNativeWebView.postMessage(JSON.stringify({type : 'IMG_LONG_PRESS', url : src}));
							}
							longpress = true;
						}, 750);
					}
				}
				node.addEventListener("mousedown", start);
				node.addEventListener("touchstart", start);
				node.addEventListener("click", click);
				node.addEventListener("mouseout", cancel);
				node.addEventListener("touchend", cancel);
				node.addEventListener("touchleave", cancel);
				node.addEventListener("touchcancel", cancel);
			}
		};
		const config = {attributes:false, childList:true, subtree:true};
		const callback = function(mutations, observer){
			setupLongPress();
		}
		var observer = new window.MutationObserver(callback);
		observer.observe(document.body, config);
	})();
`;

export const SPA_urlChangeListener = `(function () {
	var __mmHistory = window.history;
	var __mmPushState = __mmHistory.pushState;
	var __mmReplaceState = __mmHistory.replaceState;
	function __mm__updateUrl(){
		const siteName = document.querySelector('head > meta[property="og:site_name"]');
		const title = siteName || document.querySelector('head > meta[name="title"]') || document.title;
		const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);

		window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
			{
				type: 'NAV_CHANGE',
				payload: {
					url: location.href,
					title: title,
				}
			}
		));

		setTimeout(() => {
			const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);
			window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
			{
				type: 'GET_HEIGHT',
				payload: {
					height: height
				}
			}))
		}, 500);
	}

	__mmHistory.pushState = function(state) {
		setTimeout(function () {
			__mm__updateUrl();
		}, 100);
		return __mmPushState.apply(history, arguments);
	};

	__mmHistory.replaceState = function(state) {
		setTimeout(function () {
			__mm__updateUrl();
		}, 100);
		return __mmReplaceState.apply(history, arguments);
	};

	window.onpopstate = function(event) {
		__mm__updateUrl();
	};
  })();
`;

export const JS_ENABLE_VCONSOLE = `(function () {
	let vConsole = new VConsole()
	console.log("hello world! vConsole")
})()`;

export const JS_POST_MESSAGE_TO_PROVIDER = (message, origin) => `(function () {
	try {
		window.postMessage(${JSON.stringify(message)}, '${origin}');
	} catch (e) {
		//Nothing to do
	}
})()`;

export const JS_IFRAME_POST_MESSAGE_TO_PROVIDER = (message, origin) => `(function () {})()`;
/** Disable sending messages to iframes for now
 *
`(function () {
	const iframes = document.getElementsByTagName('iframe');
	for (let frame of iframes){

			try {
				frame.contentWindow.postMessage(${JSON.stringify(message)}, '${origin}');
			} catch (e) {
				//Nothing to do
			}

	}
})()`;
 */
