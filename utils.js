exports.matchRegex = (regex, text) => {
    return (text.match(regex) || [""])
}