import { WebhookClient, MessageEmbed, Formatters } from 'discord.js';
import { request } from 'undici';
import cheerio from 'cheerio';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as setPromisedTimeout } from 'timers/promises';
import { randomInt } from 'node:crypto';

const { hyperlink, quote, time } = Formatters;

class Feed {
  /**
   * @constructor
   * @param {import('cheerio').Cheerio<import('cheerio').Element>} htmlData
   */
  constructor(htmlData) {
    this.info = htmlData.find('div[class="title"]').text();
    this.id = htmlData.attr('data-id');
    this.extra = htmlData
      .find(`a[data-id="${this.id}"][class="comment-link"]`)
      .attr('href');

    {
      const mainVideo = htmlData.attr('data-twitpic');

      if (mainVideo?.includes('video'))
        this.video = mainVideo;
      else {
        const twitterVideo = htmlData
          .find('blockquote[class="twitter-video"]')
          .first();

        this.video = twitterVideo.find('a').attr('href') ?? null;
      }
    }

    this.image =
      htmlData.find('div[class="img"]').find('img').attr('src') ?? null;
  }
}

class Article {
  /**
   * @constructor
   * @param {Feed} feed
   * @param {import('cheerio').CheerioAPI} htmlData
   */
  constructor(feed, htmlData) {
    this.image = feed.image;
    this.info = feed.info;
    this.id = feed.id;
    this.extra = feed.extra;
    this.video = feed.video;

    this.source = htmlData('a[class="source-link"]').attr('href') ?? null;
  }
}

/**
 * Reads the relative config.json file.
 * @param {string} [key] The key of the config value to return.
 * @returns {any}
 */
function readConfig(key) {
  const data = JSON.parse(readFileSync('./config.json', 'utf-8'));

  return key != undefined ? data[key] : data;
}

/**
 * Writes the config.json with the specified keys and values.
 * @param {Record<string, any>} data
 * @returns {void}
 */
function writeConfig(data) {
  writeFileSync('./config.json', JSON.stringify(Object.assign(readConfig(), data)));
}

const webhookClient = new WebhookClient({ url: readConfig('url') ?? null });

/**
 * Send a message to the webhook.
 * @param {Article} htmlContent
 * @returns {Promise<void>}
 */
async function sendToWebhook(htmlContent) {
  const time_ = new Date();

  const embed = new MessageEmbed()
    .setColor(0xf1c40f)
    .setThumbnail('https://cdn.discordapp.com/emojis/691373958087442486.png')
    .setAuthor({
      name: 'New update about Ukraine',
      url: 'https://github.com/VoltrexMaster/liveuamap-news'
    })
    .setDescription(
      `${
        htmlContent.source !== null
          ? hyperlink('ℹ️ Source of the news', htmlContent.source)
          : 'ℹ️ Unable to find source...'
      }\n${htmlContent.info}`
    )
    .addField(
      'Timezones',
      `🇺🇸 ${time_.toLocaleString('en-US', {
        timeZone: 'America/New_york'
      })}\n🇺🇦 ${new Date(
        time_.getTime() + 7_200_000
      ).toLocaleString()}\n🌍 ${time(time_, 'd')} ${time(time_, 't')}`
    );

  if (htmlContent.image !== null && (readConfig('embedImage') ?? true))
    embed.setImage(htmlContent.image);
  if (htmlContent.video !== null)
    embed.description += `\n\n${quote(
      'Warning: Can be graphical, view at your own risk'
    )}\n${hyperlink('Twitter video', htmlContent.video)}`;

  await webhookClient.send({ embeds: [embed] });
}

const symbols = {
  '+': chalk.green,
  '-': chalk.red,
  '!': chalk.yellow,
  '?': chalk.cyan
};

/**
 * Uses chalk to log text in pretty colors.
 * @param {string} symbol The symbol to indicate the color of the log.
 * @param {any} value The value to log.
 * @returns {void}
 */
function prettyLog(symbol, value) {
  console.log(symbols[symbol](`[${symbol}]`), value);
}

while (true) {
  // Random wait time to not be too obvious, since we're scarping the website.
  const randomTimeout = randomInt(45, 75);

  try {
    prettyLog(
      '?',
      `${new Date().toLocaleString()} - Checking for new articles...`
    );
    prettyLog('+', 'Fetching all articles and parsing HTML...');

    const liveuamapResponse = await request('https://liveuamap.com/');
    const $ = cheerio.load(liveuamapResponse.body);

    let latestNews = $('div[id="feedler"]');

    if (latestNews.length === 0) {
      // For some weird reason, this website loves to crash with HTTP 5XX internal server errors.
      // So we try again because the website encourages us to, really.
      prettyLog(
        '!',
        'Failed to get feedler, probably a 5XX error, trying again...'
      );

      await setPromisedTimeout(5000);
      continue;
    }

    latestNews = latestNews.children().first();

    const news = new Feed(latestNews);

    if (news.id !== (readConfig('lastId') ?? null)) {
      prettyLog('+', 'New article found, checking article...');

      const extraResponse = await request(news.extra);
      const $_ = cheerio.load(extraResponse.body);

      await sendToWebhook(new Article(news, $_));

      writeConfig({ lastId: news.id });

      prettyLog('!', news.info);
    } else prettyLog('-', `No news found, waiting ${randomTimeout} seconds...`);
  } catch (err) {
    prettyLog('!', err);
  }

  await setPromisedTimeout(randomTimeout * 1_000);
}
