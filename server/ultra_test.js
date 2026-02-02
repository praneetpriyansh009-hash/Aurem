console.log('IMMEDIATE TEST - IF YOU SEE THIS, NODE WORKS');
setTimeout(() => {
    console.log('TIMEOUT TEST - IF YOU SEE THIS, ASYNC WORKS');
    process.exit(0);
}, 1000);
