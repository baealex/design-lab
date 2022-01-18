function between(str, left, right, idx=0 ) {
    const regex = new RegExp("(?:"+left.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')+")((.|[\r\n])*?)(?:"+right.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')+")", 'g');
    const res = String(str).match(regex);

    if (Number.isInteger(idx) == false) {
        idx = 0;
    }

    if (res && res.length > idx) {
        if (idx == -1){
            const r = res[res.length-1];
            return r.substring(left.length, r.length-right.length);
        }
        const r = res[idx];
        return r.substring(left.length, r.length-right.length);
    }
    return '';
}

function tagSplit(str, openTag, closeTag){
    const lists = str.split(openTag);
    const contents = [];
    for (let i = 1; i<lists.length; i++) {
        lists[i] = openTag + lists[i];
        const tagContent = between(lists[i], openTag, closeTag);
        contents[i-1] = tagContent;
    }
    return contents;
}

module.exports = {
    between,
    tagSplit
}