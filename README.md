# bitly-client

Use [Bitly](https://bitly.com/) from the command line

![bitly-client -c 12](http://specious.github.io/bitly-client/screenshots/bitly-client-1.1.5.png "bitly-client@1.1.5")

## Install

```
pnpm i -g bitly-client
```

## Usage

```
bitly-client --help
```

## Usage examples

#### Retrieve all saved bitlinks (in reverse chronological order)

```
bitly-client
```

#### Retrieve your five most recently created bitlinks

```
bitly-client -5
```

#### Shorten a URL

```
bitly-client https://www.quora.com/What-are-the-most-interesting-HTML-JS-DOM-CSS-hacks-that-most-web-developers-dont-know-about
```

#### Look up the original url that a bitlink redirects to

```
bitly-client https://bit.ly/www-net
```

```
bitly-client j.mp/www-net
```

```
bitly-client www-net
```

#### Archive a bitlink ([what does that mean?](http://support.bitly.com/knowledgebase/articles/154192-how-do-i-delete-a-bitlink))

```
bitly-client -a http://bit.ly/1WOyimn
```

#### Pass multiple arguments

```
bitly-client regexplained google-crash facts-about-money joebiden-archive
```

#### Use an alternative short domain (including a [custom domain](https://support.bitly.com/hc/articles/230558107-What-is-a-Branded-Short-Domain-bsd-and-how-do-I-get-one-))

```
bitly-client --domain j.mp https://github.com/opsmatters/bitly-java-api/tree/1319b3e/src/main/java/com/opsmatters/bitly/api/model/v4 
```

#### Have some fun (see what existing short links redirect to)

```
bitly-client have you ever had a dream that you were so sure was real
```

## License

ISC