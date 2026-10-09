/* Copied from Code games/doodle-telephone/prompts.js by scripts/sync-games.sh. Edit the original, then run npm run sync-games. */
(function () {
var module = { exports: {} }, exports = module.exports;
var require = function (m) {
  if (m !== 'crypto') throw new Error('No browser version of ' + m);
  return {
    // a fair random whole number in [min, max), like Node's crypto.randomInt
    randomInt: function (min, max) {
      if (max === undefined) { max = min; min = 0; }
      var range = max - min, limit = Math.floor(4294967296 / range) * range, buf = new Uint32Array(1), x;
      do { window.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return min + (x % range);
    }
  };
};
// Doodle Telephone prompt pack: silly things to draw. Used for the 🎲 idea button, the "random prompts" setting,
// and to fill in for anyone who falls asleep. Short, concrete and a little weird draws best.
module.exports = [
  'A cat riding a skateboard', 'A shark at a birthday party', 'A dinosaur doing homework', 'A snowman at the beach',
  'A pizza with sunglasses', 'A giraffe stuck in an elevator', 'A robot walking a dog', 'A penguin on vacation',
  'A banana running a marathon', 'A ghost doing laundry', 'A cow jumping over the moon', 'A frog prince eating flies',
  'A wizard who lost his wand', 'An alien ordering fast food', 'A hamster lifting weights', 'A volcano sneezing',
  'A burrito in a sleeping bag', 'A dragon at the dentist', 'A turtle winning a race', 'A pirate with a rubber duck',
  'A mermaid on a bicycle', 'A vampire at the beach', 'A cactus giving a hug', 'A bear stealing a picnic basket',
  'A chicken crossing the road', 'A sloth on a roller coaster', 'A snail with a jetpack', 'A ninja in a library',
  'A cupcake with a mustache', 'An octopus playing drums', 'A llama wearing pajamas', 'A king who is very small',
  'A tornado made of spaghetti', 'A dog driving a car', 'A zombie doing yoga', 'A superhero afraid of spiders',
  'A monkey eating a banana split', 'A fish in a fishbowl on a train', 'A caveman using a phone', 'A duck in a tuxedo',
  'A lighthouse at a disco', 'A cloud crying rain', 'A sandwich that is too tall', 'An astronaut mowing the lawn',
  'A pig flying a plane', 'A bee with a tiny umbrella', 'A spider knitting a sweater', 'A rocket made of cheese',
  'A unicorn stuck in traffic', 'A teacher asleep at her desk', 'A goat on a trampoline', 'A mummy unraveling',
  'A tooth fairy with a hammer', 'A dragon roasting marshmallows', 'A clown in a tiny car', 'A horse wearing high heels',
  'A panda eating spaghetti', 'An owl reading the news', 'A crab doing a cartwheel', 'A kid building a snow fort',
  'The Mona Lisa taking a selfie', 'A haunted vending machine', 'A hot dog in a hot tub', 'A lion getting a haircut',
  'A worm in an apple house', 'A pineapple under the sea', 'A bat hanging from a ceiling fan', 'A carrot in a salad bowl pool',
  'A dog that ate the homework', 'A tree with a treehouse on fire', 'A potato watching TV', 'A kangaroo with a full pouch',
  'An elephant hiding behind a tree', 'A snake in a sock', 'A boxing kangaroo', 'A toaster launching toast into space',
  'A pumpkin wearing a crown', 'A moose in a canoe', 'A lobster in a business suit', 'A sheep counting people',
  'A scarecrow scared of crows', 'A mouse stealing cheese from a trap', 'A jellyfish at a rock concert', 'A cat knocking a cup off a table',
  'Grandma on a motorcycle', 'A knight fighting a vacuum cleaner', 'A worm with a mustache', 'A camel with three humps',
  'A bird building a nest in someone\'s hair', 'A traffic light having a bad day', 'A snowball fight', 'A pig in a mud bath',
  'A pencil drawing itself', 'A baby running the country', 'A robot falling in love with a toaster', 'Ice cream melting in the desert',
  'A giant eating a tiny sandwich', 'A dog chasing its tail', 'A fish riding a bicycle', 'A skeleton playing the xylophone',
  'A hippo in a tutu', 'A gnome guarding a garden', 'A monster under the bed', 'A cookie dunking itself in milk',
  'A soccer ball with a black eye', 'A chef chasing a runaway chicken', 'A surfing hamster', 'A sad balloon',
  'A tired alarm clock', 'A dragon hoarding socks', 'A cat stuck in a tree', 'A bear in a bathtub',
  'A pirate ship in a bathtub', 'A robot DJ', 'A snowman melting in a sauna', 'A penguin sliding down a rainbow',
  'A detective looking for his glasses', 'A cheeseburger with legs', 'A tiny horse in a big field', 'A shark afraid of water',
  'A grandpa break dancing', 'A duck stuck in a revolving door', 'A banana slipping on a person', 'A dog walking a human',
  'A cow in an elevator', 'An egg hatching a dinosaur', 'A crocodile brushing its teeth', 'A queen losing her crown',
  'A giraffe with a sore throat', 'A flamingo on one roller skate', 'A bus full of cats', 'A thunderstorm inside a house',
  'A mermaid stuck in a kiddie pool', 'A sleepy sun', 'A zebra without stripes', 'A lost sock\'s adventure',
  'A walrus at a job interview', 'Santa stuck in a chimney', 'A haunted house having a yard sale', 'A cat wearing a lampshade',
  'A dinosaur at a tea party', 'A squirrel with a huge acorn', 'A hamburger eating a hamburger', 'A robot doing laundry',
  'A seal balancing a pizza', 'A dog with too many tennis balls', 'A caterpillar putting on shoes', 'A popcorn explosion',
  'An angry cloud chasing someone', 'A frog on a lily pad throne', 'A time traveler meeting a dinosaur', 'A bear who wants a hug',
];

window.DT_PROMPTS = module.exports;
})();
