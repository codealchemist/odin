const findLargestFile = (files) => {
 let max = 0;
 let largestFile;

 files.forEach(file => { if (file.length > max) largestFile = file })

 return largestFile;
}


module.exports = { findLargestFile }