// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJ2sw7giL65YenxDtJ2MzksRQTHSu7SdY",
  authDomain: "prompt-lab-demo.firebaseapp.com",
  projectId: "prompt-lab-demo",
  storageBucket: "prompt-lab-demo.firebasestorage.app",
  messagingSenderId: "504464672052",
  appId: "1:504464672052:web:db084ee0a570bfa288d161",
  measurementId: "G-CZFL9Z07F7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ add this to your firebase.js

export async function saveUsernameToDB(name, topic = "") {
  try {
    await addDoc(collection(db, "participants"), {
      username: name,
      topic: topic,
      timestamp: new Date().toISOString()
    });
    console.log("✅ 이름 저장 성공!");
  } catch (e) {
    console.error("🔥 이름 저장 실패:", e);
  }
}


// ✅ 외부에서 접근할 수 있게 export
export async function saveFullResultsToDB(username, topic, promptHistory, gptResponses, ratingHistory) {
  const results = {};

  for (let i = 1; i <= 6; i++) {
    const qKey = `Q${i}`;
    results[qKey] = {
      input: promptHistory[qKey] || "",
      gptResponse: gptResponses[qKey] || "",
      rating: ratingHistory[qKey]?.['별점 평가'] || {},
      기타_의견: ratingHistory[qKey]?.['기타 의견'] || ""
    };
  }

  try {
    await addDoc(collection(db, "results"), {
      username,
      topic,
      timestamp: new Date().toISOString(),
      results
    });
    console.log("✅ 전체 결과 Firestore에 저장 완료!");

    // ✅ 여기서 성공 후 alert + reload
    alert("실험에 참여해주셔서 감사합니다 :)");
    window.location.replace("./index.html");

  } catch (e) {
    console.error("🔥 전체 결과 저장 실패:", e);
    alert("⚠️ 저장에 실패했어요. 다시 시도해주세요!");
  }
}
