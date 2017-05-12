# bitly-client

Access [Bitly](https://bitly.com/) from the command line ([What is Bitly?](http://support.bitly.com/knowledgebase/articles/77224-what-is-bitly))

![bitly-client -c 12](http://specious.github.io/bitly-client/screenshots/bitly-client-1.1.5.png "bitly-client@1.1.5")

## Install

```
npm install -g bitly-client
```

## Usage

```
bitly-client --help
```

## Usage examples

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

Archive a bitlink ([what does that mean?](http://support.bitly.com/knowledgebase/articles/154192-how-do-i-delete-a-bitlink)):

```
bitly-client -a http://bit.ly/1WOyimn
```

Pass multiple arguments:

```
bitly-client regexplained google-crash facts-about-money
```

Use a different short domain (including a [custom domain](https://support.bitly.com/hc/articles/230558107-What-is-a-Branded-Short-Domain-bsd-and-how-do-I-get-one-) added to your Bitly account):

```
bitly-client --domain j.mp https://www.bitballoon.com/blog/2014/10/03/five-reasons-you-want-https-for-your-static-site
```

## License

ISC