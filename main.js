const WebSocket = require('ws');
const crypto = require('crypto-js');

var data = {
	target: 0.01,
	bfx: {
		bal: {btc: 0, yyw:0},
		bid: {p:0, q:0},
		ask: {p:0, q:0},
		arb: {p:0, q:0},
		comm: 0.002,
		minyyw: 48
	},
	bnb: {
		bal: {btc: 0, yyw:0},
		bid: {p:0, q:0},
		ask: {p:0, q:0},
		arb: {p:0, q:0},
		comm: 0.001,
		minbtc: 0.002
	}
}

function start_bfx(){
	
    var ws = new WebSocket('wss://api.bitfinex.com/ws/');
	var handled = 0;
	var isAlive = true;
	var timeoutObj;
	
	ws.onopen = () => {
		
		// API keys setup here (See "Authenticated Channels")
		const apiKey = ''
		const apiSecret = ''

		const authNonce = Date.now() * 1000
		const authPayload = 'AUTH' + authNonce
		const authSig = crypto
			.HmacSHA384(authPayload, apiSecret)
			.toString(crypto.enc.Hex)

		const payload = {
		  apiKey,
		  authSig,
		  authNonce,
		  authPayload,
		  event: 'auth'
		}

		ws.send(JSON.stringify(payload));
		
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
					console.log(getDateTime() + ' [Bitfinex] subscribed to YYW tickers');
					break;
				case "pong": 
					isAlive = true;
					break;
				case 'error':
					console.log(getDateTime() + ' [Bitfinex] ERROR: ' + obj.code + ' ' + obj.obj);
					shit = true;
					reconnect_bf();
					break;
			}
		} else if (typeof obj[0] === 'number' && obj.length == 11){
			console.log(obj);
			// return ticker!
			data.bfx.bid.p = obj[1];
			data.bfx.bid.q = obj[2];
			data.bfx.ask.p = obj[3];
			data.bfx.ask.q = obj[4];

		}
	});

	timeoutObj = setInterval(function(){
		if (!isAlive){
			console.log(getDateTime() + ' [Bitfinex] Ping-pong test failed');
			reconnect_bf();
		}
		isAlive = false;
		ws.send(JSON.stringify({
		   "event":"ping",
		}));
	}, 3000);
	
	
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
			clearTimeout(timeoutObj);
			setTimeout(function(){
				console.log(getDateTime() + ' Bitfinex websocket reconnecting.');
				ws.close();
				start_bf();
			}, 1000);
		}
	}
	
}

function printAll(){
	//process.stdout.write('\033c');
	console.log(data.bfx.bid.p + ' '+ data.bfx.bid.q + ' ' + data.bfx.ask.p + ' ' + data.bfx.ask.q);
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;

}

start_bfx();
//var timerPrintObj = setInterval(printAll, 10000);
