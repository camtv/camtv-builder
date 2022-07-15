const axios = require('axios');
const https = require('https');

class TranslationsFile {

    constructor(url, KeyLang = "key", removeKeyLang = true) {
		this.url = url
		this.missingKeys = [];
		this.usedKeys = [];
		this.missingKeysUpdate = false;
		this.usedKeysUpdate = false;
		this.removeKeyLang = removeKeyLang;
        this.Data = {
            "Langs": [],
            "KeyLang": KeyLang,
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
				let kvLang = json.data[0];
				this.Data.Langs = Object.values(kvLang)

				if(this.removeKeyLang){
					this.Data.Langs = this.Data.Langs.filter(v => v !== this.Data.KeyLang); 
				}

				json.data.splice(0,1)

				this.Data.Translations = json.data;
			}catch (ex) {
				console.log('\x1b[31m%s\x1b[0m',"Error on get translations file: "+ex)
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
			var hasKey = this.Data.Translations.some(function(element) {
				if(element.key == key){
					return true;
				}
			});

			if(hasKey == false){
				this.missingKeys.push(key)
			}
		}		
	}

	UpdateMissingKeys(){
		if(this.missingKeys.length>0){
			var keys = this.missingKeys.join("%_%");
			if(this.url != null && this.url != ''){
				if(this.missingKeysUpdate == false){
					this.missingKeysUpdate = true
					try{
						let url = this.url + "?key=" + encodeURIComponent(keys);
						if(url.length <= 2048){
							let json = axios(url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
						}else{
							console.log(this.missingKeys);
							console.log("UpdateMissingKeys failed: too much keys missing")
						}
					}catch (ex) {
						console.log("UpdateMissingKeys failed: "+ ex)
						console.log(this.missingKeys);
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
							console.log("UpdateUsedKeys failed: too much keys")
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