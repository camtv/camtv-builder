const axios = require('axios');
const https = require('https');
const { url_download, url_set_missing_key } = require('./config');

class TranslationsFile {

    constructor() {
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
		let json = await axios(url_download, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
		this.Data.Translations = json.data;
		return this.Data;
	}

	Set(key){
		let url = url_set_missing_key + key;
		//let json = axios(url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
	
	}
}

module.exports = TranslationsFile