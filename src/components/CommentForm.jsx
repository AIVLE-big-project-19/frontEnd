import { useState } from "react";
import { createComment } from "../api/commentApi";

function CommentForm({boardId}){

    const [writer,setWriter]=useState("");

    const [content,setContent]=useState("");

    const submit = async()=>{

        await createComment(boardId,{

            writer,

            content

        });

        alert("댓글 등록 완료");

    }

    return(

        <div>

            <input

                placeholder="작성자"

                onChange={(e)=>setWriter(e.target.value)}

            />

            <textarea

                placeholder="댓글"

                onChange={(e)=>setContent(e.target.value)}

            />

            <button onClick={submit}>

                등록

            </button>

        </div>

    );

}

export default CommentForm;