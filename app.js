require('dotenv').config();
const url = require('url');
const http = require('http');
const { login } = require('tplink-cloud-api');

const LightControl = {
    getPercent(request) {
        const query = url.parse(request.url, true).query;

        // if we have a color temp (CT) value in our request, then we use that
        // to calculate our percent.  otherwise, we just create a random value
        // that we use instead, likely for testing.
        // noinspection JSUnresolvedVariable

        let percent = query.ct

            // the f.lux settings produce a CT range from 5900 to 2500.  to
            // calculate a percentage that goes from 100% to 0, we'll subtract
            // 2500 from our values.  otherwise, the lowest percentage would
            // be 2500/5900*100 = 42.

            ? (query.ct - 2500) / 3400 * 100
            : Math.random() * 100;

        percent = Math.ceil(percent);

        // now, so that the light isn't too dim, we'll create a floor by
        // checking if our percent is less than 10.  if it is, then we simply
        // return 10.  otherwise, we return the calculation we performed above.

        return percent < 10 ? 10 : percent;
    }
}

const server = http.createServer(async (request, response) => {
    const tpLink = await login(process.env.USER, process.env.PASS, process.env.UUID);
    await tpLink.getDeviceList();

    // now that we've logged in and checked our device list.  we can actually
    // request the office light.  then, if it's on, we'll do some stuff.

    const light = await tpLink.getLB100('Office Light');
    if (await light.isOn()) {

        // now that we know it's on, we'll want to calculate the our percent
        // using the above LightControl object.  then, we set our state using
        // it as our luminosity.

        const percent = LightControl.getPercent(request);
        await light.setState(1, percent);
    }

    response.statusCode = 200;
    response.end()
});

server.listen(process.env.PORT);
