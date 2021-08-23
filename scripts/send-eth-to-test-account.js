async function send(){
  try{
    await web3.eth.sendTransaction({
      from: "0xe3D02935F8504d394e2EdEEF29Fb000CBe70BC7f",
      to: "0xF994Eba5f3F33EbC5a03d9B5e195765eeb29a923",
      value: "1111000000000000000000",
    })
  } catch(e){
    console.error(e)
  }
}

send()
