const axios = require('axios');
const https = require('https');

class TranslationsFile {

    constructor(url) {
		this.url = url
		this.missingKeys = [];
		this.usedKeys = [];
		this.missingKeysUpdate = false;
		this.usedKeysUpdate = false;
		
        this.Data = {
            "Langs": ["it","en","key"],
            "KeyLang": "key",
            "Translations": []
        }
		this.agent = new https.Agent({
			rejectUnauthorized: false
		});
    }

	async Get() {
		if(this.url != null && this.url != ''){
			try{
				let json = await axios(this.url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
				this.Data.Translations = json.data;
			}catch (ex) {
				console.log("Error on get translations file")
			}
		}else{
			console.log("Missing --translations-url-download parameter")
		}
		return this.Data;
	}

	SetUsed(key){
		if(this.usedKeys.includes(key) == false){
			this.usedKeys.push(key)
		}
	}

	SetMissing(key){
		if(this.missingKeys.includes(key) == false){
			if(! (key in this.Data.Translations)){
				this.missingKeys.push(key)
			}
		}		
	}

	UpdateMissingKeys(){
		if(this.missingKeys.length>0){
			var keys = this.missingKeys.join(",");
			if(this.url != null && this.url != ''){
				if(this.missingKeysUpdate == false){
					this.missingKeysUpdate = true
					try{
						let url = this.url + "?key=" + encodeURIComponent(keys);
						if(url.length <= 2048){
							let json = axios(url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
						}else{
							console.log("UpdateMissingKeys failed: too much keys missing")
						}
					}catch (ex) {
						console.log("UpdateMissingKeys failed: "+ ex)
					}
				}
			}else{
				console.log("Cannot set Missing Translation Key: "+keys)
			}
		}
	}

	UpdateUsedKeys(){
		if(this.usedKeys.length>0){
			var keys = this.usedKeys.join(",");
			if(this.url != null && this.url != ''){
				if(this.usedKeysUpdate == false){
					this.usedKeysUpdate = true
					try{
						let url = this.url + "?ukey=" + encodeURIComponent(keys);
						if(url.length <= 2048){
							axios(url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
						}else{
							console.log("UpdateUsedKeys failed: too much keys missing")
						}
					}catch (ex) {
						console.log("UpdateUsedKeys failed: "+ ex)
					}
				}
			}else{
				console.log("Cannot set Used Translation Key: "+keys)
			}
		}
	}
}

module.exports = TranslationsFile