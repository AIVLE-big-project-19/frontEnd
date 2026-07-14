import { useState } from "react";
import { createBoard } from "../api/boardApi";

function BoardWritePage(){

    const [title,setTitle] = useState("");
    const [content,setContent] = useState("");
    const [writer,setWriter] = useState("");
    const [category,setCategory] = useState("");
    const submit = async () => {

        await createBoard({
            title,
            content,
            writer,
            category
        });

        alert("등록 완료");
    }

    return(
        
        <div>

            <input

                placeholder="제목"

                onChange={(e)=>setTitle(e.target.value)}

            />

            <br/>

            <input

                placeholder="작성자"

                onChange={(e)=>setWriter(e.target.value)}

            />

            <br/>

            <input

                placeholder="카테고리"

                onChange={(e)=>setCategory(e.target.value)}

            />

            <br/>

            <textarea

                onChange={(e)=>setContent(e.target.value)}

            />

            <br/>

            <button onClick={submit}>

                등록

            </button>

        </div>

    );

}

export default BoardWritePage;