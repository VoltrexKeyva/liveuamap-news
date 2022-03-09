# LiveUAMap News

Gets news from https://liveuamap.com/ and sends it to a Discord webhook.

# Credit

This is a replica of [ukraine_discord](https://github.com/AlexFlipnote/ukraine_discord) written
in JavaScript.

# Setup

1. Install the Node.js runtime from it's [official website](https://nodejs.org/).
2. Install Git from it's [official website](https://git-scm.com/).
3. Clone the repository:

```shell
$ git clone https://github.com/VoltrexMaster/liveuamap-news
```

4. Create a Discord webhook in a channel (Skip this step if you've already done it):

- Right-click on a Discord channel.
- Click on the "Edit Channel" button.
- Click on the "Integrations" tab.
- Click on the "View Webhooks" button.
- Click on the "Create Webhook" button to create a new webhook for that channel.
- Customize your webhook if you want and click on the "Save changes" button to save the changes made to your webhook.
- Finally click on the "Copy Webhook URL" button to copy the URL of the webhook (Only share this URL to those you trust as the webhook can be hijacked and spammed/edited/deleted).

5. Create a `config.json` file and put your Discord webhook URL you just copied to the `url` field:

```json
{
  "url": "Your Discord webhook URL goes here"
}
```

and save the file.

6. Install the dependencies by running:

```shell
$ npm install
```

7. Finally run the program by running:

```shell
$ node .
```
