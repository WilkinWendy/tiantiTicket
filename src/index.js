const axios = require('axios')
const cheerio = require('cheerio')

function parseToFieldList(html) {
    const $ = cheerio.load(html)
    const timesInfos = $('.ground-title .nl').map((idx, item) => {
        return {
            "start-time-line": item.attribs["start-time-line"],
            "timeSpan": `${item.children.filter(item=>item.type==='tag').map(item=>item.children[0].data.trim()).join('')}`
        }
    }).toArray()

    const fieldInfos = $('.ground-detail .field-list .field-select-box .half-time .segment').map((idx, item) => {
        return {
            "price": item.attribs["price"],
            "listing-price": item.attribs["listing-price"],
            "start-time": item.attribs["start-time"],
            "end-time": item.attribs["end-time"],
            "field-num": item.attribs["field-num"],
            "field-segment-id": item.attribs["field-segment-id"],
            "state": item.attribs["state"],
            "field-id": item.attribs["field-id"],
            "venue-name": item.attribs["venue-name"],
        }
    }).toArray()

    return {
        timesInfos,
        fieldInfos
    }
}
async function requestFields(date, cookie) {
    const res = await axios({
        url: `https://webssl.xports.cn/aisports-weixin/court/ajax/1101000301/1002/1255/${date}`,
        method: "get",
        headers: {
            Cookie: cookie
        }
    })
    return parseToFieldList(res.data)
}

function sum(arr) {
    const res = 0
    arr.forEach(item => {
        res += parseInt(item)
    })
    return res
}

function groupByKey(items, keyFetcher) {
    const res = {}
    items.forEach(item => {
        const curK = keyFetcher(item)
        if (!res[curK]) {
            res[curK] = []
        }
        res[curK].push(item)
    })
    return res
}

async function commitOrder(date, fields, cookie) {
    const fieldInfo = fields.map(item => item["field-segment-id"]).join(',')
    // const groupedFields = groupByKey(fields, (item) => {
    //     return `${item["field-num"]-item["start-time"]-item["end-time"]}`
    // })
    const fieldInfoList = fields.map(item => {
        return {
            "price": item.price,
            "startSegment": item['start-time'],
            "endSegment": item['end-time'],
            "fieldNum": item['field-num'],
            "fieldId": item['field-id'],
            "fieldSegmentId": item['field-segment-id'],
            "listingPrice": item['listing-price'],
            // "venueName": "蓝羽区5"
        }
    })
    var data = {
        "venueId": "1101000301",
        "serviceId": "1002",
        "fieldType": "1254",
        "day": date,
        fieldInfo,
        fieldInfoList
    }
    console.log(JSON.stringify(data))
    const res = await axios({
        url: "https://webssl.xports.cn/aisports-weixin/court/commit",
        method: "post",
        headers: {
            Cookie: cookie
        },
        data: data
    })
    return res
}

function getToOrderFields(originalFields, fieldNumList, timeList) {
    const matchTimeList = timeList.map(item => {
        return (parseInt(item) * 2).toString()
    })
    return originalFields.filter(item => item['state'] == '0').filter(item => matchTimeList.includes(item['start-time']) && fieldNumList.includes(item['field-num']))
}

async function main(date, fieldNumList, timeList, cookie) {
    try {
        const infos = await requestFields(date, cookie)
        if (!infos.fieldInfos || infos.fieldInfos.length === 0) {
            throw new Error('场地获取失败')
        }
        console.log("场地获取成功")
        const orderFields = getToOrderFields(infos.fieldInfos, fieldNumList, timeList)
        if (orderFields.length === 0) {
            throw new Error('没有符合条件的场地')
        }
        await commitOrder(date, orderFields, cookie)
        console.log("预定成功")
    } catch (ex) {
        console.log(ex.message, ex.response && ex.response.data)
        console.log("执行失败")
    }
}
// setInterval(() => {
main("20230403", ["17", "18"], ['20', '21'], "JSESSIONID=37EEDBEFBEB8A853204817E21194366F;")
// }, 1000)