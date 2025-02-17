{
	"translatorID": "5f0ca39b-898a-4b1e-b98d-8cd0d6ce9801",
	"label": "Airiti",
	"creator": "Aurimas Vinckevicius",
	"target": "^https?://([^/]+\\.)?airitilibrary\\.com/Publication/alDetailedMesh",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 110,
	"inRepository": true,
	"translatorType": 12,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-11 00:55:12"
}

function detectWeb(doc, url) {
	// How can we distinguish thesis from journal article??
	if (ZU.xpathText(doc, '/html/head/meta[@name="citation_title"]/@content')) {
		return 'journalArticle';
	}
}

function getDocId(url) {
	var m = url.match(/\bDocID=([^&#]+)/);
	if (!m) return;
	return m[1];
}

async function doWeb(doc, url) {
	var docID = getDocId(url);
	await scrape([docID], function(item) {
		if (!item.url) {
			// Maybe we shouldn't. Looks more like a catalog.
			item.url = url;
		}
		
		item.attachments.push({
			title: 'Snapshot',
			document: doc
		});
		
		item.complete();
	});
}

async function scrape(docIDs, itemDoneHandler) {
	let tokenParams = new URLSearchParams();
	tokenParams.append('BER', JSON.stringify(docIDs.map(id => ({
		DocID: id,
		IsCanAddShoppingCar: null
	}))));
	tokenParams.append('IsShowLink', 'false');
	tokenParams.append('keepThis', 'true');
	// This sets the necessary cookies:
	await requestDocument('https://www.airitilibrary.com/Publication/MetaExport?' + tokenParams);

	var bibTeXUrl = buildQuery(docIDs);
	ZU.doGet(bibTeXUrl, function(text) {
		var translator = Zotero.loadTranslator("import");
		// BibTeX
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler('itemDone', function(obj, item) {
			// Chinese names are not split correctly
			// Sometimes, English name is provided as well in parentheses
			for (var i=0, n=item.creators.length; i<n; i++) {
				var c = item.creators[i];
				
				var zhChar = /[\u4E00-\u9FFF]/;
				if (!zhChar.test(c.firstName) && !zhChar.test(c.lastName)) continue;
				
				delete c.fieldMode;
				
				var name = (c.firstName || "") + (c.lastName || "");
				var trimAt = name.indexOf('(');
				
				if (trimAt == 0) {
					c.lastName = name;
					delete c.firstName;
					c.fieldMode = 1;
					continue;
				} else if (trimAt != -1) {
					name = name.substr(0, trimAt);
				}
				
				name = name.trim();
				
				c.lastName = name.substr(name.length-1);
				if (name.length > 1) {
					c.firstName = name.substr(0, name.length-1);
				} else {
					delete c.firstName;
					c.fieldMode = 1;
				}
			}
			
			// language is sometimes written in chinese
			// use "zh", since I think dialect actually varies in this catalog
			item.language = "zh";
			
			// search- and web-specific itemDone handlers
			if (itemDoneHandler) itemDoneHandler(item);
			else item.complete();
		});
		translator.translate();
	});
}

function buildQuery(docIDs) {
	var url = 'https://www.airitilibrary.com/publication/ExportTo?ExportType=BibTex'
		+ '&parameter=0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16';
	for (var i=0; i<docIDs.length; i++) {
		url += '&DocIDs[' + i + ']=' + encodeURIComponent(docIDs[i]);
	}
	return url;
}

// TODO: Re-enable search
// e.g. 10.6220/joq.2012.19(1).01
function detectSearch(items) {
	if (!items) return false;
	
	if (typeof items == 'string' || !items.length) items = [items];
	
	for (var i=0, n=items.length; i<n; i++) {
		if (!items[i]) continue;
		
		if (items[i].DOI && ZU.cleanDOI(items[i].DOI)) return true;
		if (typeof items[i] == 'string' && ZU.cleanDOI(items[i])) return true;
	}
	
	return false;
}

function filterQuery(items) {
	if (!items) return [];
	
	if (typeof items == 'string' || !items.length) items = [items];
	
	//filter out invalid queries
	var query = [];
	for (var i=0, n=items.length; i<n; i++) {
		if ( ( items[i].DOI && ZU.cleanDOI(items[i].DOI) )
			|| ( typeof items[i] == 'string' && ZU.cleanDOI(items[i]) ) ) {
			query.push(items[i]);
		}
	}
	return query;
}

function doSearch(items) {
	var query = filterQuery(items);
	var queryTracker = {};
	var dois = [];
	for (let i=0, n=query.length; i<n; i++) {
		var doi = ZU.cleanDOI(query[i].DOI || query[i]);
		followDOI(doi);
	}
}

function followDOI(doi) {
	ZU.processDocuments('https://doi.org/' + encodeURIComponent(doi), async function(doc, url) {
		//var redirectedUrl = ZU.xpathText(doc, '//meta[@name="citation_abstract_html_url"]/@content');
		var docID = ZU.xpathText(doc, '//a/@docid');
		if (!docID) return;
		await scrape([docID]);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=P20110413001-200411-201104130017-201104130017-446-453",
		"items": [
			{
				"itemType": "conferencePaper",
				"title": "國小自然與生活科技教師參與輔導團研習活動之民俗誌研究",
				"creators": [
					{
						"lastName": "鴻",
						"creatorType": "author",
						"firstName": "曾國"
					},
					{
						"lastName": "露",
						"creatorType": "author",
						"firstName": "賴秋"
					},
					{
						"lastName": "娟",
						"creatorType": "author",
						"firstName": "鍾季"
					},
					{
						"lastName": "桂",
						"creatorType": "author",
						"firstName": "何妙"
					},
					{
						"lastName": "榮",
						"creatorType": "author",
						"firstName": "廖文"
					}
				],
				"date": "2004-11",
				"DOI": "10.29495/CITE.200411.0446",
				"abstractNote": "本研究針對九年一貫輔導團規劃之「國小自然與生活科技領域研習」進行探究，目的是探討教師參與輔導團研習活動的意願及其影響因素，並瞭解輔導團研習活動對自然與生活科技教師教學能力之影響，最後根據研究結果提供輔導團作爲規劃研習活動之參考。本研究採俗民誌研究法，研究者先進入研習現場參與觀察，再以六位自然與生活科技領域相關教師爲對象，進行焦點團體訪談，最後輔以相關資料文件做分析，研究結果發現：充實知識是參與研習意願的動力來源、研習的時間爲教師決定是否參與研習的重要因素、家庭狀況與研習地點的安排影響教師是否參與研習的決定、研習的方式應考量研習的目的做不同形式的安排、研習教材內容會充實教師的專業知能、講師的授課方式讓研習教師對教學技巧自我反省。研習綜合歸納之研究結論如下：1.自然與生活科技教師參與輔導團研習活動的意願高。2.影響教師參與輔導團研習活動的意願之主要因素爲「研習時間」、「研習地點」、「家庭狀況」。3.輔導團研習活動在「教材內容」方面，對教師之影響爲充實知識與補充教學資料。4.輔導團之研習在「講師授課方式」方面，對教師在運用教具、教學方法與師生互動等層面有影響。The aim of the research is to examine teachers willing of participating in further study in Science and Technology field held by CEAG (Compulsory Education Advisory Group) and factors that influenced their participation. Also, the effects of further study to the teachers teaching abilities in teaching Science and Technology filed. Finally, giving the research results to CEAG as a reference for planning further study afterwards. This research adopt ethnographic approach that researcher goes to the scene of further study to observe, and then choose six teachers to have a group interview. Then compare with the relevant information to analyze. The result shows: Pursuing of great knowledge is the motivation of teachers to participate in further study; Time is the most influential factor that teacher determine whether to attend the further study; Family conditions and place affect their decisions to participate in further study; Way of further study should take the purpose of further study into consideration to have different arrangement; The content of the further study would enrich teachers’ teaching abilities; Teaching style of the lecturer would motivate self-examination in teachers' teaching techniques. In conclusion: 1. Most of teachers in Science and Technology field like to participate in further study. 2. The main reasons that affect teachers’ participation in further study are time, place and family condition. 3. In the aspect of teaching content, further study held by CEAG helps teachers by supplying relevant teaching materials. 4. In the aspect of teaching style of lecturer, further study held by CEAG helps teachers: to use teaching aids more effectively, an alternative thinking on their teaching methods, and improve interaction between teacher and student.",
				"itemID": "AL:P20110413001-200411-201104130017-201104130017-446-453",
				"language": "zh",
				"libraryCatalog": "Airiti",
				"pages": "446-453",
				"proceedingsTitle": "科技教育課程改革與發展學術研討會論文集",
				"publisher": "國立高雄師範大學",
				"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=P20110413001-200411-201104130017-201104130017-446-453",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Compulsory Education Advisory Group"
					},
					{
						"tag": "ethnographic"
					},
					{
						"tag": "science and life technology"
					},
					{
						"tag": "solution-focused group counseling"
					},
					{
						"tag": "study"
					},
					{
						"tag": "俗民誌"
					},
					{
						"tag": "自然與生活科技"
					},
					{
						"tag": "輔導團"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Publication/alDetailedMesh1?DocID=U0011-0406200711273000",
		"items": [
			{
				"itemType": "thesis",
				"title": "學童口腔保健行為與新齲齒發生之探討－10個月追蹤研究",
				"creators": [
					{
						"lastName": "鳳",
						"creatorType": "author",
						"firstName": "張雀"
					}
				],
				"date": "2007-01",
				"abstractNote": "中文摘要 研究背景： 台灣國小學童高齲齒率在校園內儼然是學童健康的一大問題，以DMFT分析是與累積的危險因素有關，然而兒童在不同時期造成齲齒的危險因子應不全然相同；齲齒形成的複雜性和多成因的特質，評估齲齒的危險因子應以追蹤研究來加以分析，採追蹤研究（prospective follow-up study）可將當期新齲齒的發生與當時期那些影響因素作分析比較。 研究目的： 了解學童口腔健康狀況與口腔保健行為關係及影響新齲齒發生之相關因素。 研究方法： 本研究為追蹤研究（prospective follow-up study），研究對象以高雄縣某公立小學1至5年級學童為對象，每個年級3個班級，共完成問卷及口腔檢查人數為504人；經過10個月後之後測剔除未能全程參與或中途轉學者剩餘475人，其中男生261人、女生214人，後測完成率94.25％。 研究結果： 在10個月的追蹤研究發現DMFT index平均增加了0.35； DMFS index平均增加了0.45（p＜.0001﹐p＜.0001 ），恆牙填補率增加5.00（p=0.0450）， DMFT index 在9歲時增加呈現高峰0.46，之後隨年齡的增加逐漸趨於平緩，整體而言達統計上的顯著性差異，性別方面發現女生比男生有較高的DMFT index及DMFS index，其齲齒狀況則隨年齡增加而遞增。在多變項迴歸分析調整過前測DMFT指數、性別、年級、父親教育程度、甜食習慣、潔牙時機與看牙醫的經驗等重要影響因素之後，發現父親教育程度與前後改變量的恆牙填補率有顯著性相關。而研究中也發現主要影響學童口腔健康來自於家庭因素。 討論及結論： 整體而言恆牙齲齒經驗指數男生優於女生，盛行率方面亦發現同樣的結果；在填補數上結果顯示女生的填補數則較男生高，研究發現學童的潔牙行為可有效減少齲齒的發生。餐後潔牙及攝取甜食後有潔牙行為其齲齒經驗指數較低，齲齒發生率亦較少 建議： 口腔保健是一個連續性、長遠性、必然性的推展工作，因此健康促進不只注重於健康及與健康有關的行為，也應該致力於健康及健康行為與環境之間的關係。Abstract Background: High caries prevalence is still a major problem for Taiwanese pupils. The phenomenon, analyzed by DMFT, was related to the accumulated risk factors. However, caries risk factors in different growing periods would be various. Prospective follow-up study was used to analyze the risk factors of caries owing to the complex of forming and the multi-origin characteristics. The researcher adopted prospective follow-up study to compare and analyze the new contemporaneous incidence of caries and the influence factors. Aim: The aim of this study was to evaluate the relationship among new oral incidence of caries, oral health behavior, and related factors. Methods: Prospective follow-up study was assumed in this study. Study participants were recruited from first grader to fifth grader of a primary school in Kaohsiung County .For each grade, 3 classes were randomly selected, questionnaired, and orally examined with finally a total of 504 subjects. After 10 months of following-up, students who couldn’t participate thoroughly or transferred to other schools during the study were excluded. A total of 475 subjects (male: 261; female:214) remained with the completion rate of 94.25% of the posttest. Result: The result showed an increase of 0.35 on mean DMFT index, 0.45 (p < .0001, p < .0001) on DMFS index, and 5.00 (p = 0.0450) on filling rate of permanent teeth in this 10-month prospective follow-up study. The increase of DMFT index reached the peak of 0.46 at the age of 9, and then gently steadied by the addition of age. Overall, a statistically significant difference showed in the study. On the aspect of gender, higher DMFT index and DMFS index were presented on girl students, whose caries status augmented when the age increased. After the adjustment of important influence factors the pretest of DMFT index, gender education, sweet habit, timing of cleaning teeth, and the dental clinic experience in the Multiple Regression Analysis, the researcher found a strong relation between father’s education and the filling rates of the caries of permanent teeth on pretest and posttest. Meanwhile, domestic factors were the key to influence oral health of school children. Discussion and Conclusion: The DMFT index of permanent teeth was higher on boys than on girls, same as the prevalence. The result of filling rate indicated girls’ filling rate was higher than boys’. The behavior of cleaning teeth on school children could effectively lessen the occurring of caries. Cleaning teeth after meal and after sweet lowered the DMFT index and the caries incidence. Suggestion: Oral health was an inevitable, long-term, and continual promotion job.Therefore, health promotion should focus not only on physical condition and health-related behaviors but also on the relationship among health, health-related behaviors, and environment.",
				"extra": "DOI: 10.6832/KMU.2007.00008",
				"itemID": "AL:U0011-0406200711273000",
				"language": "zh",
				"libraryCatalog": "Airiti",
				"numPages": "1-167",
				"thesisType": "Master's Thesis",
				"university": "高雄醫學大學",
				"url": "https://www.airitilibrary.com/Publication/alDetailedMesh1?DocID=U0011-0406200711273000",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Oral health"
					},
					{
						"tag": "caries incidence"
					},
					{
						"tag": "follow-up study"
					},
					{
						"tag": "口腔保健"
					},
					{
						"tag": "追蹤研究"
					},
					{
						"tag": "齲齒發生率"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=10220690-201202-201202200002-201202200002-1-20",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Study of Second Level of People Capability Maturity Model on the Industrial Control Industry in Taiwan",
				"creators": [
					{
						"firstName": "Yin-Che",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "King-Ching",
						"lastName": "Hsieh",
						"creatorType": "author"
					},
					{
						"firstName": "Mei-Tai",
						"lastName": "Wu",
						"creatorType": "author"
					}
				],
				"date": "2012-02",
				"DOI": "10.6220/joq.2012.19(1).01",
				"ISSN": "1022-0690",
				"abstractNote": "The People Capability Maturity Model (P-CMM) is an evolving channel for and a roadmap of organizational development and improvement. This model comprises five consecutive maturity levels: initial, managed, defined, predictable, and optimized. The unique characteristics of P-CMM lie in the standardization of processes guiding employees to perform their daily routines more efficiently. This was a field research project that used document analysis, observation, interviews, and analysis of researchers' field notes. By triangulating this data, researchers hoped to maintain a satisfactory level of reliability and validity for the model. Through on-site research into the industrial control industry, researchers endeavored to obtain some indication of the significance and potential application of this model. After evaluating each step of the current production process, researchers made necessary changes or appropriate adjustments based on the protocol set out in the second level of P-CMM to evaluate and diagnose the model.",
				"issue": "1",
				"itemID": "AL:10220690-201202-201202200002-201202200002-1-20",
				"language": "zh",
				"libraryCatalog": "Airiti",
				"pages": "1-20",
				"publicationTitle": "品質學報",
				"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=10220690-201202-201202200002-201202200002-1-20",
				"volume": "19",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "field research"
					},
					{
						"tag": "people capability maturity model"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "search",
		"input": {
			"DOI": "10.6220/joq.2012.19(1).01"
		},
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Study of Second Level of People Capability Maturity Model on the Industrial Control Industry in Taiwan",
				"creators": [
					{
						"firstName": "Yin-Che",
						"lastName": "Chen",
						"creatorType": "author"
					},
					{
						"firstName": "King-Ching",
						"lastName": "Hsieh",
						"creatorType": "author"
					},
					{
						"firstName": "Mei-Tai",
						"lastName": "Wu",
						"creatorType": "author"
					}
				],
				"date": "February 2012",
				"DOI": "10.6220/joq.2012.19(1).01",
				"ISSN": "1022-0690",
				"abstractNote": "The People Capability Maturity Model (P-CMM) is an evolving channel for and a roadmap of organizational development and improvement. This model comprises five consecutive maturity levels: initial, managed, defined, predictable, and optimized. The unique characteristics of P-CMM lie in the standardization of processes guiding employees to perform their daily routines more efficiently. This was a field research project that used document analysis, observation, interviews, and analysis of researchers' field notes. By triangulating this data, researchers hoped to maintain a satisfactory level of reliability and validity for the model. Through on-site research into the industrial control industry, researchers endeavored to obtain some indication of the significance and potential application of this model. After evaluating each step of the current production process, researchers made necessary changes or appropriate adjustments based on the protocol set out in the second level of P-CMM to evaluate and diagnose the model.",
				"issue": "1",
				"itemID": "AL:10220690-201202-201202200002-201202200002-1-20",
				"language": "zh",
				"libraryCatalog": "Airiti",
				"pages": "1-20",
				"publicationTitle": "品質學報",
				"url": "http://www.airitilibrary.com/Publication/alDetailedMesh?DocID=10220690-201202-201202200002-201202200002-1-20",
				"volume": "19",
				"attachments": [
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"field research",
					"people capability maturity model"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=10213120-198905-28-1-377-382-a&PublishTypeID=P001",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Jones Dye Test與Fluorescein Dye Disappearance Test的再評估",
				"creators": [
					{
						"firstName": "陳彥",
						"lastName": "志",
						"creatorType": "author"
					},
					{
						"firstName": "高啓",
						"lastName": "祥",
						"creatorType": "author"
					},
					{
						"firstName": "林素",
						"lastName": "玲",
						"creatorType": "author"
					}
				],
				"date": "1989-05",
				"DOI": "10.30048/ACTASOS.198905.0069",
				"ISSN": "1021-3120",
				"abstractNote": "對一般眼科門診時常遭遇到的主訴流淚的患者，應如何以簡便有效的方法測試？本篇收集無症狀的三十人（六十眼）施以Jones Dye Test與Fluorescein Dye Disappearance Test評量它們的可行性，正確性及彼此的關聯。Jones Ⅰ染料試驗的陽性率可達86.7%，然而Fluorescein Dye Disappearance Test的陽性率卻高達95.3%，前者有直接證據但是後者卻屬間接觀察，但兩者皆不失為評估排淚功能簡易而有效的方法。We Studied 30 randomly selected individuals without epiphora. Jones dye test and Fluorescein dye disappearance test (FDDT) were performed and evaluated. Among 60 eyes, only 1 eye (1.7%) was regarded as negative in FDDT while 8 eyes (13.3%) were negative in Jones Ⅰ dye test. However, none was negative in Jones Ⅱ test. We also concluded that Subjects whose Basal Secretion test values are over 10mm/5min have Statisticably higher positive rate in Jones Ⅰ test than those under l0min/5min. The Study suggests that Jones Ⅰ test remains the most important screening test for assessment of lacrimal excretion, however, FDDT can be given as an adjunct for its high sensitivity and rapid interpretation.",
				"issue": "1",
				"itemID": "AL:10213120-198905-28-1-377-382-a",
				"language": "zh",
				"libraryCatalog": "Airiti",
				"pages": "377-382",
				"publicationTitle": "中華民國眼科醫學會雜誌",
				"url": "https://www.airitilibrary.com/Publication/alDetailedMesh?DocID=10213120-198905-28-1-377-382-a&PublishTypeID=P001",
				"volume": "28",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Epiphora"
					},
					{
						"tag": "Fluorescein Dye Disappearance Test"
					},
					{
						"tag": "Jones Dye Test"
					},
					{
						"tag": "Lacrimal Pump"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
