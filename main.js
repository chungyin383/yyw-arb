const WebSocket = require('ws');
const crypto = require('crypto-js');
const keys = require('./key');
const binance = require('node-binance-api');

var data = {
	target: 0.01,
	bfx: {
		bal: {btc: 0, yyw:0},
		mybid: {p:0, q:0, id:0},
		myask: {p:0, q:0, id:0},
		comm: 0.002,
		minyyw: 48
	},
	bnb: {
		bal: {btc: 0, yyw:0},
		bid: {p:0, q:0},
		ask: {p:0, q:0},
		mybid: {p:0, q:0},
		myask: {p:0, q:0},
		comm: 0.001,
		minbtc: 0.002
	}
}

function start_bfx(){
	
    var ws = new WebSocket('wss://api.bitfinex.com/ws/2');
	var handled = 0;
	var isAlive = true;
	var timeoutObj;
	
	ws.onopen = () => {
		
		// https://docs.bitfinex.com/v2/docs/ws-auth
		const apiKey = keys.bfxKey;
		const apiSecret = keys.bfxSecret;

		const authNonce = Date.now() * 1000;
		const authPayload = 'AUTH' + authNonce;
		const authSig = crypto
			.HmacSHA384(authPayload, apiSecret)
			.toString(crypto.enc.Hex);

		const payload = {
			apiKey,
			authSig,
			authNonce,
			authPayload,
			event: 'auth'
		}

		ws.send(JSON.stringify(payload));
		
		timeoutObj = setInterval(function(){
			if (!isAlive){
				console.log(getDateTime() + ' [Bitfinex] No heartbeat');
				reconnect_bfx();
			}
			isAlive = false;
		}, 10000);
		
		setTimeout(function(){bfx_place_order(0.00001, 100)}, 5000);
		setTimeout(function(){bfx_cancel_order(data.bfx.mybid.id)}, 10000);
	}
	
    ws.on('message', function(msg) {
		isAlive = true; // no need to handle heartbeat, every message means alive
		obj = JSON.parse(msg);
		if (Object.prototype.toString.call( obj ) === '[object Object]'){
			switch(obj.event) {
				case "auth":
					if (obj.status === 'OK'){
						console.log(getDateTime() + ' [Bitfinex] Authentication OK');
					} else {
						console.log(getDateTime() + ' [Bitfinex] Authentication NOT OK');
					}
					break;
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
				case 'error':
					console.log(getDateTime() + ' [Bitfinex] ERROR: ' + obj.code + ' ' + obj.obj);
					break;
				default:
					console.log(obj);
			}
		} else if (Object.prototype.toString.call( obj ) === '[object Array]') {
			if (obj[0] === 0) {
				switch(obj[1]) {
					case 'ws': //wallet snapshot
						for (var i = 0; i < obj[2].length; i++){
							if (obj[2][i][1] === 'BTC') {
								data.bfx.bal.btc = obj[2][i][2];
								console.log(getDateTime() + ' [Bitfinex] Initial BTC balance: ' + data.bfx.bal.btc);
							}
							if (obj[2][i][1] === 'YYW') {
								data.bfx.bal.yyw = obj[2][i][2];
								console.log(getDateTime() + ' [Bitfinex] Initial YYW balance: ' + data.bfx.bal.yyw);
							}
						}
						break;
					case 'wu': //wallet update
						if (obj[2][1] === 'BTC') {
							data.bfx.bal.btc = obj[2][1];
							console.log(getDateTime() + ' [Bitfinex] BTC balance: ' + data.bfx.bal.btc);
						}
						if (obj[2][1] === 'YYW') {
							data.bfx.bal.yyw = obj[2][1];
							console.log(getDateTime() + ' [Bitfinex] YYW balance: ' + data.bfx.bal.yyw);
						}
						break;
					case 'os': //order snapshot
						if (obj[2].length == 0) {
							console.log(getDateTime() + ' [Bitfinex] No open orders');
						} else {
							console.log(getDateTime() + ' [Bitfinex] Shit there are ' + obj[2].length + ' open orders!');
						}
						break;
					case 'on': //new order
						if (obj[2][6] > 0) {
							console.log(getDateTime() + ' [Bitfinex] Buy order placed for ' + data.bfx.mybid.q + 'YYW @' + data.bfx.mybid.p);
							data.bfx.mybid.id = obj[2][0];
						} else {
							console.log(getDateTime() + ' [Bitfinex] Sell order placed for ' + data.bfx.myask.q + 'YYW @' + data.bfx.myask.p);
							data.bfx.myask.id = obj[2][0];
						}
						break;
					case 'oc': //cancel order
						if (obj[2][6] > 0) {
							console.log(getDateTime() + ' [Bitfinex] Buy order cancelled');
						} else {
							console.log(getDateTime() + ' [Bitfinex] Sell order cancelled');
						}
						break;
					default:
						console.log(obj);
				}
			} 
		}
	});
	
    ws.onclose = function(){
		reconnect_bfx();
		console.log(getDateTime() + ' [Bitfinex] Socket closed.');
    };
	
	ws.onerror = function(){
		reconnect_bfx();
		console.log(getDateTime() + ' [Bitfinex] Error occured.');
    };
	
	function reconnect_bfx(){
		if (handled++ == 0){
			clearTimeout(timeoutObj);
			setTimeout(function(){
				console.log(getDateTime() + ' [Bitfinex] Websocket reconnecting.');
				ws.close();
				start_bfx();
			}, 1000);
		}
	}
	
	bfx_place_order = function(p, q){
		const payload = [
			0,
			"on", // new order
			null,
			{
				"cid": q > 0 ? 1 : 2,
				"type": 'EXCHANGE LIMIT',
				"symbol": 'tYYWBTC',
				"amount": q.toString(),
				"price": p.toString()
			}
		]
		ws.send(JSON.stringify(payload));
	}
	
	bfx_cancel_order = function(id){
		const payload = [
			0,
			"oc",
			null,
			{
				"id": id
			}
		]
		ws.send(JSON.stringify(payload));
	}
	
}

binance.options({
	'APIKEY' : keys.bnbKey,
	'APISECRET' : keys.bnbSecret
});


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
