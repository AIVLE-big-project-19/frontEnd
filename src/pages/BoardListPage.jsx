import { useEffect, useState } from "react";
import { getBoards } from "../api/boardApi";
import BoardCard from "../components/BoardCard";

function BoardListPage(){

    const [boards, setBoards] = useState([]);

    useEffect(() => {
        loadBoards();
    }, []);

    const loadBoards = async () => {
        try{
            const response = await getBoards();
            setBoards(response.data.data.content);

        }catch(error){
            console.log(error);
        }
    }

    return(
        <div>
            <h1>게시판</h1>
            {
                boards.map(board => (
                    <BoardCard
                        key={board.boardId}
                        board={board}
                    />
                ))
            }
        </div>
    );
}

export default BoardListPage;