import { useEffect, useState } from "react";
import "./CSS/ShortNoteComponent.css";
function GetAllShortNotes() {

    const [shortNotes, setShortNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const getAllShortNotes = async () => {

        const userId =
            localStorage.getItem("userId") || "ankit0397";

        setLoading(true);
        setError("");

        try {

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/short-note`,
                {
                    method: "GET",
                    headers: {
                        "userId": userId,
                        "categoryId": 'hgfhgf'
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load short notes");
            }

            const data = await response.json();

            setShortNotes(data.data.items);
            console.log(data);

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        getAllShortNotes();
    }, []);

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className="short-note-container">

            <h2>Short Notes</h2>

            {error && (
                <p className="error">{error}</p>
            )}

            <div className="table-wrapper">

                <table className="short-note-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Content</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {shortNotes.map((note) => (

                            <tr key={note.id}>

                                <td className="note-name">
                                    {note.title}
                                </td>

                                <td className="note-content">
                                    {note.content}
                                </td>

                                <td>
                                    {note.categoryId}
                                </td>

                                <td>
                                    <a href={`/short-note/${note.id}`}>
                                        Open
                                    </a>

                                    {" | "}

                                    <a href={`/short-note/${note.id}/edit`}>
                                        Edit
                                    </a>
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            {shortNotes.length === 0 && (
                <p>No short notes found.</p>
            )}

        </div>
    );
}

export default GetAllShortNotes;