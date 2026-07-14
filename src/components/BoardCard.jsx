function BoardCard({board}){
    return(
        
        <div>
            <h3>{board.title}</h3>

            <p>{board.writer}</p>

            <p>조회수 : {board.viewCount}</p>

            <hr/>

        </div>

    );

}
export default BoardCard;