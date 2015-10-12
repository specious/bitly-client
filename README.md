# bitly-client

Access [Bitly](https://bitly.com/) from the command line

## Install

```
npm install -g bitly-client
```

## Usage

Retrieve all saved bitlinks (in reverse chronological order):

```
bitly-client
```

Retrieved only the five newest bitlinks:

```
bitly-client -c 5
```

Shorten a long URL:

```
bitly-client https://www.quora.com/What-are-the-most-interesting-HTML-JS-DOM-CSS-hacks-that-most-web-developers-dont-know-about
```

Look up the long url for a bitlink:

```
bitly-client http://bit.ly/1WOyimn
```

## License

Licensed under the [MIT License](http://en.wikipedia.org/wiki/MIT_License)