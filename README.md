# p-api
Unofficial Pornhub API is a  Node.js-based REST API that scrapes and exposes publicly available metadata from pornhub.com. You can fetch video data, trending videos and more via clean JSON responses.

## Requirements

![Node.js](https://img.shields.io/badge/Node.js-16%2B%20%7C%2018%2B-brightgreen?logo=nodedotjs)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/brian404/p-api.git
   cd p-api
2. Install dependencies:

    ```bash
    npm i
    ```

3. Start the server:

    ```bash
    npm start
    ```
    ## Usage
By default, the API will be running at:
http://localhost:3099/api/

Visit /api/docs in your browser for full documentation.

## Endpoints

Base URL: `http://localhost:3099/api/`

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Endpoint Path</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/</span></td>
      <td>Returns a welcome message</td>
    </tr>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/trending</span></td>
      <td>Fetches trending video IDs</td>
    </tr>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/random</span></td>
      <td>Fetches a single random video ID from Pornhub’s video page</td>
    </tr>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/categories</span></td>
      <td>Lists all Pornhub categories with their names and IDs</td>
    </tr>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/studios</span></td>
      <td>Lists all Pornhub studios</td>
    </tr>
    <tr>
      <td><span style="color: green;"><b>GET</b></span></td>
      <td><span style="color: dodgerblue;">/video/:id</span></td>
      <td>Gets metadata for a specific video</td>
    </tr>
    <tr>
      <td><span style="color: orange;"><b>POST</b></span></td>
      <td><span style="color: dodgerblue;">/status</span></td>
      <td>Returns API status and uptime</td>
    </tr>
  </tbody>
</table>

## Disclaimer

This project is not affiliated with Pornhub. It uses publicly available data for educational and non-commercial purposes only.  
No video content is hosted, and the author is not responsible for misuse.

## Contributions
Contributions, ideas, and improvements are always welcome!  
Feel free to open an issue, suggest a feature, or submit a pull request.
## Demo

[![Live API](https://img.shields.io/badge/Live%20API-online-brightgreen?style=flat-square&logo=nodedotjs)](https://node-1-sync.obj3ct32.com:8443/api/docs)

A live instance of the API is available here:  
[https://node-1-sync.obj3ct32.com:8443/api/docs](https://node-1-sync.obj3ct32.com:8443/api/docs)

This endpoint provides full interactive documentation and allows you to test the API in real time.

Note: This is a public, self-hosted demo intended for testing and development only.
