module.exports = {
    "extends": "standard",
    "plugins": [
        "standard",
        "promise"
    ],
    "parserOptions": {
        "ecmaVersion": 6
    },
    "rules": {
        "indent": ["error", 2, {"SwitchCase": 1}],
        "semi": ["error", "never"],
        "quotes": ["error", "single"],
    }
};