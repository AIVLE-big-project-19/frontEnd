import { useEffect,useState } from "react";
import { getBoard } from "../api/boardApi";
import CommentList from "../components/CommentList";

function BoardDetailPage(){

    const [board,setBoard]=useState(null);

    const boardId = 1;

    useEffect(()=>{

        loadBoard();

    },[]);

    const loadBoard = async()=>{

        const response = await getBoard(boardId);

        setBoard(response.data.data);

    }

    if(!board){

        return <div>Loading...</div>

    }

    return(

        <div>

            <h2>{board.title}</h2>

            <p>{board.writer}</p>

            <hr/>

            <p>{board.content}</p>

            <CommentList boardId={boardId}/>

        </div>

    );

}

export default BoardDetailPage;