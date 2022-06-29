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
    }

	async Get() {
		const agent = new https.Agent({
			rejectUnauthorized: false
		});

		let json = await axios(url_download, { headers: { 'Accept': 'application/json' }, httpsAgent: agent })

	
		this.Data.Translations = json.data;
		console.log("JSON")
		console.log(this.Data);
		return this.Data;
	}

	async Set(key){
		let json = await axios(url_set_missing_key +key, { headers: { 'Accept': 'application/json' }, httpsAgent: agent })
	}
}

module.exports = TranslationsFile