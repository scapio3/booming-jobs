const axios = require('axios');
const { response } = require('express');
const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const app = express();
const path = require('path');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const port = process.env.PORT || 3000;

//function to call search api
const callSearch = async(title,locations,pageSize,pageNumber) =>{


    const payload = 
    {"paging" :{
        "pageNumber":pageNumber,
        "pageSize": pageSize
    },
    "search":
    {
        "title": title, 
        "locations": locations, 
        "employmentType": null, 
        "companies": null, 
        "companyType": null
    },
    "sortOption": "relevance desc",
    "userId": null
    
    }
    let response = {
        query_term:null,
        cumulative_gain :null,
        discounted_cumulative_gain : null,
        ideal_cumulative_gain : null,
        normalized_cumulative_gain : null,
        precision:null,
        precision_including_term_in_description :null,
       full_results: {
           perfect_hits : [],
           relevant_hits : [],
           irrelevant_hits:[]
       }
    };
const res = await axios.post('https://api.booming.jobs/api/search', payload);
        let resultsCount = res.data.data.result.length;
        let correctHits = 0;
        let wrongHits = 0;
        let titleInDescriptionHits = 0;

      //  let titleToCompare = title.toLowerCase();
        //let locationToCompare = locations[0].toLowerCase();
       const ranking = {
           irelevant : 0,
           relevant:1,
           perfect:2
       }
       let perfect_hits = [];
       let relevant_hits = [];
       let irelevant_hits = [];
       let current_ranking = [];

       let cumulative_gain = 0;
       let discounted_cumulative_gain = 0;

    
       for (let index = 0; index < resultsCount; index++) {

            let id  = (res.data.data.result[index].id);
            let result = res.data.data.result;
            let titles =  result[index].title.toLowerCase();
            let description = result[index].description.toLowerCase();
            let indexOfHit = (result.findIndex(obj=>obj.id == id)+1);
      
            //let location = res.data.data.result[index].location.toLowerCase();
            const regEx = new RegExp(title,'gi')
            let foundInTitle = titles.search(regEx);
            let foundinDescription = description.search(regEx)


           if(foundInTitle !==-1)
           {         
               let perfect_hits_results = {link:null,title:null,description:null,number_of_keyword_in_description:null} 
               let dcgPerHit = ranking.perfect/Math.log2(indexOfHit+1);
               correctHits++;
               cumulative_gain = cumulative_gain+ranking.perfect;
               discounted_cumulative_gain = discounted_cumulative_gain + dcgPerHit;
               perfect_hits.push(ranking.perfect);
               current_ranking.push(ranking.perfect);
               perfect_hits_results.link = "https://www.booming.jobs/vacancies/"+id;
               perfect_hits_results.title = titles;
               perfect_hits_results.description = description;
               perfect_hits_results.number_of_keyword_in_description =calculateNumberOfKeyworsInDescription(description,title);
               response.full_results.perfect_hits.push(perfect_hits_results);
            
           }   
           else {

                     
            if(foundinDescription !== -1)
            {
                let relevant_hits_results = {link:null,title:null,description:null,number_of_keyword_in_description:null} 
                 let dcgPerHit = ranking.relevant/Math.log2(indexOfHit+1);
                 titleInDescriptionHits++ ;
                 cumulative_gain = cumulative_gain+ranking.relevant;
                 discounted_cumulative_gain = discounted_cumulative_gain + dcgPerHit;
                 relevant_hits.push(ranking.relevant);
                 current_ranking.push(ranking.relevant); 
                 relevant_hits_results.link = "https://www.booming.jobs/vacancies/"+id;
                 relevant_hits_results.title = titles;
                 relevant_hits_results.description = description;
                 relevant_hits_results.number_of_keyword_in_description = calculateNumberOfKeyworsInDescription(description,title);
               response.full_results.relevant_hits.push(relevant_hits_results);
             
            }
            
            else {
                let irelevant_hits_results = {link:null,title:null,description:null} 
            let dcgPerHit = ranking.irelevant/Math.log2(indexOfHit+1);
             wrongHits++;
             cumulative_gain = cumulative_gain + ranking.irelevant;
             discounted_cumulative_gain = discounted_cumulative_gain + dcgPerHit;
             irelevant_hits.push(ranking.irelevant);    
             current_ranking.push(ranking.irelevant);
             irelevant_hits_results.link = "https://www.booming.jobs/vacancies/"+id;
             irelevant_hits_results.title = titles;
             irelevant_hits_results.description = description;
           response.full_results.irrelevant_hits.push(irelevant_hits_results);
             

            }
           }
           
        }

        response.query_term = title;
        response.cumulative_gain = cumulative_gain;
        response.discounted_cumulative_gain = discounted_cumulative_gain;
        response.ideal_cumulative_gain = calculateIdealCumulativeGain(current_ranking);
        response.normalized_cumulative_gain = discounted_cumulative_gain/calculateIdealCumulativeGain(current_ranking); 
        response.precision = calculatePrecision(correctHits,wrongHits);
        response.precision_including_term_in_description = calculatePrecisionIncludeDescription(correctHits,wrongHits,titleInDescriptionHits);




  return response;

      
}
//function to calculate precision of returned results
    function calculatePrecision(correct,wrong){

        let precision = (correct/(correct+wrong))*100;
        return precision;
    }
//function to calculate precision including title in description
function calculatePrecisionIncludeDescription(correct,wrong,inDescription) {
   let precision = ((correct+inDescription)/(correct+wrong+inDescription))*100
    return precision;
}    
//function to get current rank
function calculateIdealCumulativeGain(current_rank) {
    let ideal_rank = current_rank.sort().reverse();
    let idealCumulativeGain = 0;

    for (let i = 0; i < current_rank.length; i++) {
       
            let ideal_rank_per_record = ideal_rank[i]/Math.log2(i+2);
            idealCumulativeGain = idealCumulativeGain + ideal_rank_per_record;       
    }
    return idealCumulativeGain;
}

function calculateNumberOfKeyworsInDescription(description,term) {
    let keyword_in_description = [];
    let regEx = new RegExp(term,'gi')
    while(regEx.exec(description)){
        keyword_in_description.push(term);
    }
    return keyword_in_description.length;
}

router.get('/', function(req,res)
{

    res.sendFile(path.join(__dirname + '/index.html'));
});


router.post('/analyze',async function(req,res)
{
var search_term = req.body.title;
var location = req.body.location;
var page_size = req.body.pageSize;
var page_number = req.body.pageNumber;

var result = await callSearch(search_term,[location],page_size,page_number);  
console.log(result);
res.json(result);
});

app.use("/",router);
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })


