const WebSocket = require('ws');

function start_bf(){
	
    var ws = new WebSocket('wss://api.bitfinex.com/ws/');
	var handled = 0;
	var timeoutObj;
	
	ws.onopen = () => {
		// API keys setup here (See "Authenticated Channels")
		
		// subscribe
		ws.send(JSON.stringify({
		   "event":"subscribe",
		   "channel":"ticker",
		   "pair":"YYWBTC"
		}));
		
		
	}
	
    ws.on('message', function(msg) {
		obj = JSON.parse(msg);
		if (typeof obj.event !== 'undefined'){
			switch(obj.event) {
				case "info": 
					if (typeof obj.version !== 'undefined'){
						console.log(getDateTime() + ' [Bitfinex] Version: ' + obj.version);
					} else {
						console.log(getDateTime() + ' [Bitfinex] Info: ' + obj.code + ' ' + obj.obj);
					}
					break;
				case "subscribed": 
					channel_list[obj.chanId] = obj.pair;
					break;
				case 'error':
					console.log(getDateTime() + ' [Bitfinex] ERROR: ' + obj.code + ' ' + obj.obj);
					shit = true;
					reconnect_bf();
					break;
			}
		} else if (typeof obj[0] === 'number' && obj.length == 11){
			clearTimeout(timeoutObj);
			// return ticker!
			var pairname = channel_list[obj[0]];
			bf[pairname].bid = obj[1];
			bf[pairname].ask = obj[3];
			//handleNewData();
			timeoutObj = setTimeout(() => {
				console.log(getDateTime() + ' No new data received from Bitfinex for 60 seconds.');
				reconnect_bf();
			}, 60*1000);
		}
	});
	
    ws.onclose = function(){
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex socket closed.');
    };
	
	ws.onerror = function(){
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex error occured.');
    };
	
	function reconnect_bf(){
		if (handled++ == 0){
			setTimeout(function(){
				console.log(getDateTime() + ' Bitfinex websocket reconnecting.');
				ws.close();
				start_bf();
			}, 10000);
		}
	}
	
}