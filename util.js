async function getResourceText (filename) {
    let response = await fetch(filename);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}

function htmlEncode (s) {
    var el = document.createElement("div");
    el.innerText = el.textContent = s;
    s = el.innerHTML;
    return s;
}

export { htmlEncode, getResourceText }