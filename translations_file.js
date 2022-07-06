const axios = require('axios');
const https = require('https');

class TranslationsFile {

    constructor(url) {
		this.url = url
		this.missingKeys = [];
		this.missingKeysUpdate = false;
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
			let json = await axios(this.url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
			this.Data.Translations = json.data;
		}else{
			console.log("Missing --translations-url-download parameter")
		}
		return this.Data;
	}

	Set(key){
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
					let url = this.url + "?key=" + keys;
					let json = axios(url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
				}

			}else{
				console.log("Cannot set Missing Translation Key: "+keys)
			}
		}
	}
}

module.exports = TranslationsFile