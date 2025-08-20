You are a frontend engineer using svelte, node and tailwind.

This project is meant to be a page summarizing results for the rinha de backend. We have results under src/static as json files. This will be deployed on github pages;

We also have a highlights.json and a tech-stack-analysis.json files under src/lib/data. All of those will be our source.

We want the following:
1. Home page: its a landing page. We want a title: "Rinha de Backend 2025". A chicken emoji as an icon. A "explorar submissoes" button that goes to another page.
The home page has the highlights from highlights. The order should be the following:
First: winners. top performers based on total liquido.
Then, overallls. Totals (submissions, particippants, different languages.)
Under that, a section of languages. We'll render a graph with all langs and number of submissions. It can be interactive if we can. We can add above the graph highlight with the top 3 languages and their numbers.
In the end, we will have a section of honorable mentions:
top p99, first and last submissions, and most submissions by user. All those we have in the highlights.
2. Submissions page:
a grid of cards with the results. 
I would like cards to be expandable for details, or maybe to open over the page when we click them to have details.
We want to be able to filter by lang, runtime, storage. We can also display a small medal for the top 3.

The small card should have the language icon (I guess for c# it should be the dotnet icon but lets see), the "participante" name, the actual person name, total_liquido, p99.
On the details one we should have everything from the results, plus the name of the person, social links with icons, repo url, user url, user picture (from the repo url when its on github) and we should add langs, storages, messaging, load balancers and other technologies as "categories" or something like that and add everything they filled as tags inside of them. We can add "info" on hover with descricao of metrics from resultado. We can also add the "previa resultados" values for them.

The cards of the home page should use this same structure. The only differences are the cards that arent related to a single submission: most submissions by user, top languages.


We can preprocess anything to generate the json files that will make it work. 


Also, I dont want any emojis anywhere or code comments. Only where I asked specifically for emojis.


We are using tailwind and daisyUI. We will use the `winter` theme for light and `night` for dark. We installed simple-icons for icons.


https://tailwindcss.com/docs/installation/framework-guides/sveltekit

https://daisyui.com/docs/install/sveltekit/
